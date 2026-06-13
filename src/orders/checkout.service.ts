import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { DataSource, In, Repository } from 'typeorm';
import {
  DELIVERY_FEE,
  STORE_PICKUP_ADDRESS,
} from '../common/constants/checkout.constants';
import { CHECKOUT_TTL_MINUTES } from '../common/constants/stock.constants';
import { Address } from '../address/address.entity';
import { InventoryService } from '../inventory/inventory.service';
import { Product } from '../products/product.entity';
import { Rol } from '../roles/rol.entity';
import { User } from '../users/user.entity';
import { CartService } from '../cart/cart.service';
import { CheckoutDto } from './dto/checkout.dto';
import {
  DeliveryTypeDto,
  DocTypeDto,
  GuestCheckoutDto,
  GuestCustomerDto,
  GuestDeliveryDto,
  GuestReceptorDto,
  ReceptorTypeDto,
} from './dto/guest-checkout.dto';
import { OrderStatus } from './enums/order-status.enum';
import { Order } from './order.entity';
import { OrderHasProducts } from './order_has_products.entity';

interface ResolvedReceptor {
  fullName: string;
  doc_type: DocTypeDto;
  doc_number: string;
}

@Injectable()
export class CheckoutService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Rol)
    private rolesRepository: Repository<Rol>,
    @InjectRepository(Address)
    private addressRepository: Repository<Address>,
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
    private cartService: CartService,
    private inventoryService: InventoryService,
    private jwtService: JwtService,
    private dataSource: DataSource,
  ) {}

  async checkout(userId: number, dto: CheckoutDto) {
    const cartItems = await this.cartService.getItemsForCheckout(userId);
    const cartId = await this.cartService.getActiveCartId(userId);
    const deliveryType = dto.delivery?.type ?? dto.delivery_type;

    const productsTotal = cartItems.reduce(
      (sum, item) => sum + Number(item.product.sale_price) * item.quantity,
      0,
    );
    const amount =
      productsTotal + this.getDeliveryFee(deliveryType);

    const order = await this.createPendingOrder({
      userId,
      id_address: dto.id_address,
      amount,
      items: cartItems.map((item) => ({
        id_product: item.id_product,
        quantity: item.quantity,
        unit_price: item.product.sale_price,
      })),
      snapshot: this.buildOrderSnapshot(dto.customer, dto.delivery),
    });

    if (cartId) {
      await this.cartService.markCheckedOut(cartId);
    }

    return this.ordersRepository.findOne({
      where: { id: order.id },
      relations: ['orderHasProducts', 'orderHasProducts.product'],
    });
  }

  async guestCheckout(dto: GuestCheckoutDto) {
    const products = await this.loadAndValidateGuestItems(dto.items);
    const user = await this.findOrCreateGuestUser(dto.customer);
    const receptor = this.resolveReceptor(dto.delivery, dto.customer);
    const addressPayload = this.buildAddressPayload(dto.delivery, dto.customer, receptor);

    const address = this.addressRepository.create({
      address: addressPayload.address,
      district: addressPayload.district,
      id_user: user.id,
    });
    const savedAddress = await this.addressRepository.save(address);

    const productsTotal = dto.items.reduce((sum, item) => {
      const product = products.get(item.id_product);
      return sum + Number(product?.sale_price ?? 0) * item.quantity;
    }, 0);
    const amount = productsTotal + this.getDeliveryFee(dto.delivery.type);

    const order = await this.createPendingOrder({
      userId: user.id,
      id_address: savedAddress.id,
      amount,
      items: dto.items.map((item) => ({
        id_product: item.id_product,
        quantity: item.quantity,
        unit_price: products.get(item.id_product)?.sale_price ?? 0,
      })),
      snapshot: this.buildOrderSnapshot(dto.customer, dto.delivery),
    });

    const fullOrder = await this.ordersRepository.findOne({
      where: { id: order.id },
      relations: ['orderHasProducts', 'orderHasProducts.product'],
    });

    const rolesIds = user.roles?.map((rol) => rol.id) ?? ['CLIENT'];
    const token = this.jwtService.sign({
      id: user.id,
      name: user.name,
      roles: rolesIds,
    });

    const { password, ...safeUser } = user;

    return {
      order: fullOrder,
      token: `Bearer ${token}`,
      user: safeUser,
    };
  }

  private async loadAndValidateGuestItems(
    items: GuestCheckoutDto['items'],
  ): Promise<Map<number, Product>> {
    const productIds = items.map((item) => item.id_product);
    const products = await this.productsRepository.findBy({ id: In(productIds) });
    const productMap = new Map(products.map((product) => [product.id, product]));

    for (const item of items) {
      const product = productMap.get(item.id_product);
      if (!product) {
        throw new HttpException('Producto no encontrado', HttpStatus.BAD_REQUEST);
      }

      const available = await this.inventoryService.getAvailable(item.id_product);
      if (available < item.quantity) {
        throw new ConflictException(
          `Stock insuficiente para ${product.name ?? 'un producto'}`,
        );
      }
    }

    return productMap;
  }

  private async findOrCreateGuestUser(customer: GuestCustomerDto): Promise<User> {
    const existingByEmail = await this.usersRepository.findOne({
      where: { email: customer.email },
      relations: ['roles'],
    });

    if (existingByEmail) {
      existingByEmail.name = customer.name;
      existingByEmail.lastname = customer.lastname;
      if (existingByEmail.phone !== customer.phone) {
        const phoneOwner = await this.usersRepository.findOneBy({ phone: customer.phone });
        if (phoneOwner && phoneOwner.id !== existingByEmail.id) {
          throw new ConflictException(
            'El teléfono ya está registrado con otra cuenta. Inicia sesión para continuar.',
          );
        }
        existingByEmail.phone = customer.phone;
      }
      return this.usersRepository.save(existingByEmail);
    }

    const phoneOwner = await this.usersRepository.findOneBy({ phone: customer.phone });
    if (phoneOwner) {
      throw new ConflictException(
        'El teléfono ya está registrado. Inicia sesión para continuar.',
      );
    }

    const roles = await this.rolesRepository.findBy({ id: In(['CLIENT']) });
    const guestUser = this.usersRepository.create({
      name: customer.name,
      lastname: customer.lastname,
      email: customer.email,
      phone: customer.phone,
      password: randomBytes(16).toString('hex'),
      roles,
    });

    return this.usersRepository.save(guestUser);
  }

  private resolveReceptor(
    delivery: GuestDeliveryDto,
    customer: GuestCustomerDto,
  ): ResolvedReceptor {
    if (delivery.receptor_type === ReceptorTypeDto.OTRA_PERSONA && delivery.receptor) {
      return {
        fullName: `${delivery.receptor.nombres} ${delivery.receptor.apellidos}`.trim(),
        doc_type: delivery.receptor.doc_type,
        doc_number: delivery.receptor.doc_number,
      };
    }

    return {
      fullName: `${customer.name} ${customer.lastname}`.trim(),
      doc_type: customer.doc_type,
      doc_number: customer.doc_number,
    };
  }

  private buildAddressPayload(
    delivery: GuestDeliveryDto,
    customer: GuestCustomerDto,
    receptor: ResolvedReceptor,
  ): { address: string; district: string } {
    if (delivery.type === DeliveryTypeDto.PICKUP) {
      return {
        address: [
          'Retiro en tienda',
          STORE_PICKUP_ADDRESS,
          `Cliente: ${customer.name} ${customer.lastname}`,
          `Receptor: ${receptor.fullName}`,
          `Doc receptor: ${receptor.doc_type} ${receptor.doc_number}`,
          `Tel: ${customer.phone}`,
        ].join(' | '),
        district: 'Arequipa',
      };
    }

    return {
      address: [
        delivery.direccion,
        `${delivery.distrito}, ${delivery.provincia}, ${delivery.departamento}`,
        `Ref: ${delivery.referencia}`,
        `Receptor: ${receptor.fullName}`,
        `Doc receptor: ${receptor.doc_type} ${receptor.doc_number}`,
        `Tel: ${customer.phone}`,
      ].join(' | '),
      district: delivery.distrito ?? 'Arequipa',
    };
  }

  private getDeliveryFee(deliveryType?: DeliveryTypeDto): number {
    return deliveryType === DeliveryTypeDto.DELIVERY ? DELIVERY_FEE : 0;
  }

  private buildOrderSnapshot(
    customer: GuestCustomerDto,
    delivery: GuestDeliveryDto,
  ): Partial<Order> {
    const receptor = this.resolveReceptor(delivery, customer);

    const snapshot: Partial<Order> = {
      delivery_type: delivery.type,
      delivery_fee: this.getDeliveryFee(delivery.type),
      customer_name: customer.name,
      customer_lastname: customer.lastname,
      customer_email: customer.email,
      customer_phone: customer.phone,
      customer_doc_type: customer.doc_type,
      customer_doc_number: customer.doc_number,
      receptor_type: delivery.receptor_type,
      receptor_nombres:
        delivery.receptor_type === ReceptorTypeDto.OTRA_PERSONA && delivery.receptor
          ? delivery.receptor.nombres
          : customer.name,
      receptor_apellidos:
        delivery.receptor_type === ReceptorTypeDto.OTRA_PERSONA && delivery.receptor
          ? delivery.receptor.apellidos
          : customer.lastname,
      receptor_doc_type: receptor.doc_type,
      receptor_doc_number: receptor.doc_number,
    };

    if (delivery.type === DeliveryTypeDto.DELIVERY) {
      snapshot.departamento = delivery.departamento;
      snapshot.provincia = delivery.provincia;
      snapshot.distrito = delivery.distrito;
      snapshot.direccion = delivery.direccion;
      snapshot.referencia = delivery.referencia;
    }

    return snapshot;
  }

  private async createPendingOrder(params: {
    userId: number;
    id_address: number;
    amount: number;
    items: { id_product: number; quantity: number; unit_price: number }[];
    snapshot?: Partial<Order>;
  }): Promise<Order> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + CHECKOUT_TTL_MINUTES);

    return this.dataSource.transaction(async (manager) => {
      const newOrder = manager.create(Order, {
        id_client: params.userId,
        id_address: params.id_address,
        amount: params.amount,
        status: OrderStatus.PENDIENTE_PAGO,
        expires_at: expiresAt,
        ...params.snapshot,
      });
      const savedOrder = await manager.save(newOrder);

      const orderItems = params.items.map((item) =>
        manager.create(OrderHasProducts, {
          id_order: savedOrder.id,
          id_product: item.id_product,
          quantity: item.quantity,
          unit_price: item.unit_price,
        }),
      );
      await manager.save(orderItems);

      await this.inventoryService.reserveForOrder(
        savedOrder.id,
        params.items.map((item) => ({
          id_product: item.id_product,
          quantity: item.quantity,
        })),
        manager,
      );

      return savedOrder;
    });
  }
}
