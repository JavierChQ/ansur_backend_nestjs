import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { AuthTokenService } from '../auth/auth-token.service';
import { AUTH_ERROR_CODES } from '../common/constants/auth-error-codes.constants';
import { CHECKOUT_JWT_SUB } from '../common/constants/checkout-auth.constants';
import {
  DELIVERY_FEE,
  STORE_PICKUP_ADDRESS,
} from '../common/constants/checkout.constants';
import { CHECKOUT_TTL_MINUTES } from '../common/constants/stock.constants';
import { InventoryService } from '../inventory/inventory.service';
import { Product } from '../products/product.entity';
import { User } from '../users/user.entity';
import { CartService } from '../cart/cart.service';
import { CheckoutDto } from './dto/checkout.dto';
import {
  DeliveryTypeDto,
  DocTypeDto,
  GuestCheckoutDto,
  GuestCustomerDto,
  GuestDeliveryDto,
  ReceptorTypeDto,
} from './dto/guest-checkout.dto';
import { UpdateCheckoutDeliveryDto } from './dto/update-checkout-delivery.dto';
import { GuestUserProvisioningService } from './guest-user-provisioning.service';
import { OrderInvoiceService } from './order-invoice.service';
import { OrderStatus } from './enums/order-status.enum';
import { Order } from './order.entity';
import { createUniqueOrderReferenceCode } from './order-reference.util';
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
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
    private cartService: CartService,
    private inventoryService: InventoryService,
    private guestUserProvisioning: GuestUserProvisioningService,
    private orderInvoiceService: OrderInvoiceService,
    private jwtService: JwtService,
    private authTokenService: AuthTokenService,
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

    const invoiceSnapshot = await this.orderInvoiceService.resolveInvoiceSnapshot(
      dto.invoice,
    );

    const order = await this.createPendingOrder({
      userId,
      id_address: dto.id_address,
      amount,
      items: cartItems.map((item) => ({
        id_product: item.id_product,
        quantity: item.quantity,
        unit_price: item.product.sale_price,
      })),
      snapshot: {
        ...this.buildOrderSnapshot(dto.customer, dto.delivery),
        ...invoiceSnapshot,
      },
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
    await this.assertGuestCustomerAvailable(dto.customer);

    const products = await this.loadAndValidateGuestItems(dto.items);

    const productsTotal = dto.items.reduce((sum, item) => {
      const product = products.get(item.id_product);
      return sum + Number(product?.sale_price ?? 0) * item.quantity;
    }, 0);
    const amount = productsTotal + this.getDeliveryFee(dto.delivery.type);

    const invoiceSnapshot = await this.orderInvoiceService.resolveInvoiceSnapshot(
      dto.invoice,
    );

    const order = await this.createPendingOrder({
      amount,
      items: dto.items.map((item) => ({
        id_product: item.id_product,
        quantity: item.quantity,
        unit_price: products.get(item.id_product)?.sale_price ?? 0,
      })),
      snapshot: {
        ...this.buildOrderSnapshot(dto.customer, dto.delivery),
        ...invoiceSnapshot,
      },
      is_guest_order: true,
    });

    const fullOrder = await this.ordersRepository.findOne({
      where: { id: order.id },
      relations: ['orderHasProducts', 'orderHasProducts.product'],
    });

    const checkoutToken = this.signCheckoutToken(
      order.id,
      dto.customer.email,
      order.expires_at,
    );

    return {
      order: fullOrder,
      checkout_token: `Bearer ${checkoutToken}`,
    };
  }

  async updatePendingCheckoutDelivery(
    orderId: number,
    dto: UpdateCheckoutDeliveryDto,
    auth: { userId?: number; checkoutAuth?: { orderId: number; email: string } },
  ) {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: ['orderHasProducts', 'orderHasProducts.product'],
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    if (order.status !== OrderStatus.PENDIENTE_PAGO) {
      throw new ConflictException('La orden ya no está pendiente de pago');
    }

    if (order.expires_at && order.expires_at.getTime() < Date.now()) {
      throw new HttpException('Checkout expirado', HttpStatus.GONE);
    }

    if (order.is_guest_order) {
      if (!auth.checkoutAuth || auth.checkoutAuth.orderId !== orderId) {
        throw new ForbiddenException('El token no corresponde a esta orden');
      }
    } else if (!auth.userId || order.id_client !== auth.userId) {
      throw new ForbiddenException('No puedes modificar esta orden');
    }

    const productsTotal = (order.orderHasProducts ?? []).reduce(
      (sum, line) =>
        sum +
        Number(line.product?.sale_price ?? line.unit_price ?? 0) * line.quantity,
      0,
    );

    const snapshot = this.buildOrderSnapshot(dto.customer, dto.delivery);
    const amount = productsTotal + this.getDeliveryFee(dto.delivery.type);

    Object.assign(order, snapshot, {
      amount,
      ...(dto.id_address != null ? { id_address: dto.id_address } : {}),
    });

    if (dto.delivery.type !== DeliveryTypeDto.DELIVERY) {
      order.departamento = null;
      order.provincia = null;
      order.distrito = null;
      order.direccion = null;
      order.referencia = null;
    }

    await this.ordersRepository.save(order);

    return this.ordersRepository.findOne({
      where: { id: order.id },
      relations: ['orderHasProducts', 'orderHasProducts.product'],
    });
  }

  async claimGuestSession(
    orderId: number,
    checkoutAuth: { orderId: number; email: string },
  ) {
    if (checkoutAuth.orderId !== orderId) {
      throw new ForbiddenException('El token no corresponde a esta orden');
    }

    const order = await this.ordersRepository.findOne({ where: { id: orderId } });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    if (order.customer_email !== checkoutAuth.email) {
      throw new ForbiddenException('El token no corresponde a esta orden');
    }

    if (order.status !== OrderStatus.PAGADO) {
      throw new ConflictException('La orden aún no está pagada');
    }

    const user = await this.guestUserProvisioning.provisionUserForOrder(orderId);

    if (!user) {
      throw new NotFoundException('No se pudo vincular la cuenta a la orden');
    }

    const session = await this.authTokenService.buildSessionResponse(user);

    return {
      token: session.token,
      user: session.user,
      password_not_set: user.password_not_set,
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

  private async assertGuestCustomerAvailable(customer: GuestCustomerDto): Promise<void> {
    const existingByEmail = await this.usersRepository.findOneBy({ email: customer.email });

    if (existingByEmail) {
      throw new ConflictException({
        statusCode: HttpStatus.CONFLICT,
        code: AUTH_ERROR_CODES.EMAIL_ALREADY_REGISTERED,
        message: 'Ya existe una cuenta con este correo. Inicia sesión para continuar.',
      });
    }

    const phoneOwner = await this.usersRepository.findOneBy({ phone: customer.phone });
    if (phoneOwner) {
      throw new ConflictException(
        'El teléfono ya está registrado. Inicia sesión para continuar.',
      );
    }
  }

  private signCheckoutToken(
    orderId: number,
    email: string,
    expiresAt: Date,
  ): string {
    const ttlSeconds = Math.max(
      60,
      Math.floor((expiresAt.getTime() - Date.now()) / 1000),
    );

    return this.jwtService.sign(
      {
        sub: CHECKOUT_JWT_SUB,
        order_id: orderId,
        email,
      },
      { expiresIn: ttlSeconds },
    );
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
    userId?: number;
    id_address?: number;
    amount: number;
    items: { id_product: number; quantity: number; unit_price: number }[];
    snapshot?: Partial<Order>;
    is_guest_order?: boolean;
  }): Promise<Order> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + CHECKOUT_TTL_MINUTES);

    return this.dataSource.transaction(async (manager) => {
      const referenceCode = await createUniqueOrderReferenceCode(manager);
      const newOrder = manager.create(Order, {
        reference_code: referenceCode,
        id_client: params.userId ?? null,
        id_address: params.id_address ?? null,
        amount: params.amount,
        status: OrderStatus.PENDIENTE_PAGO,
        expires_at: expiresAt,
        is_guest_order: params.is_guest_order ?? false,
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

