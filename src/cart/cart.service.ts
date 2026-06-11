import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { CartStatus } from './enums/cart-status.enum';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { InventoryService } from '../inventory/inventory.service';
import { CART_TTL_DAYS } from '../common/constants/stock.constants';
import { Product } from '../products/product.entity';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private cartsRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private cartItemsRepository: Repository<CartItem>,
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
    private inventoryService: InventoryService,
  ) {}

  async getCart(userId: number) {
    const cart = await this.getOrCreateActiveCart(userId);
    return this.mapCart(cart);
  }

  async addOrUpdateItem(userId: number, dto: AddCartItemDto) {
    const product = await this.productsRepository.findOneBy({ id: dto.id_product });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    const available = await this.inventoryService.getAvailable(dto.id_product);
    if (available < dto.quantity) {
      throw new ConflictException('Stock insuficiente para la cantidad solicitada');
    }

    const cart = await this.getOrCreateActiveCart(userId);
    let item = await this.cartItemsRepository.findOneBy({
      id_cart: cart.id,
      id_product: dto.id_product,
    });

    if (item) {
      item.quantity = dto.quantity;
    } else {
      item = this.cartItemsRepository.create({
        id_cart: cart.id,
        id_product: dto.id_product,
        quantity: dto.quantity,
      });
    }

    await this.cartItemsRepository.save(item);
    await this.refreshCartExpiry(cart.id);

    return this.getCart(userId);
  }

  async removeItem(userId: number, productId: number) {
    const cart = await this.findActiveCart(userId);
    if (!cart) {
      throw new NotFoundException('Carrito activo no encontrado');
    }

    await this.cartItemsRepository.delete({
      id_cart: cart.id,
      id_product: productId,
    });
    await this.refreshCartExpiry(cart.id);

    return this.getCart(userId);
  }

  async getItemsForCheckout(userId: number): Promise<CartItem[]> {
    const cart = await this.findActiveCart(userId);
    if (!cart) {
      throw new HttpException('El carrito está vacío', HttpStatus.BAD_REQUEST);
    }

    const items = await this.cartItemsRepository.find({
      where: { id_cart: cart.id },
      relations: ['product'],
    });

    if (items.length === 0) {
      throw new HttpException('El carrito está vacío', HttpStatus.BAD_REQUEST);
    }

    for (const item of items) {
      const available = await this.inventoryService.getAvailable(item.id_product);
      if (available < item.quantity) {
        throw new ConflictException(
          `Stock insuficiente para ${item.product?.name ?? 'un producto'}`,
        );
      }
    }

    return items;
  }

  async markCheckedOut(cartId: number): Promise<void> {
    await this.cartsRepository.update(cartId, { status: CartStatus.CHECKED_OUT });
  }

  async getActiveCartId(userId: number): Promise<number | null> {
    const cart = await this.findActiveCart(userId);
    return cart?.id ?? null;
  }

  private async getOrCreateActiveCart(userId: number): Promise<Cart> {
    let cart = await this.findActiveCart(userId);

    if (!cart) {
      cart = this.cartsRepository.create({
        id_client: userId,
        status: CartStatus.ACTIVE,
        expires_at: this.computeExpiry(),
      });
      cart = await this.cartsRepository.save(cart);
    }

    return this.loadCartWithItems(cart.id);
  }

  private async findActiveCart(userId: number): Promise<Cart | null> {
    return this.cartsRepository.findOne({
      where: { id_client: userId, status: CartStatus.ACTIVE },
    });
  }

  private async loadCartWithItems(cartId: number): Promise<Cart> {
    return this.cartsRepository.findOne({
      where: { id: cartId },
      relations: ['items', 'items.product'],
    });
  }

  private async refreshCartExpiry(cartId: number): Promise<void> {
    await this.cartsRepository.update(cartId, { expires_at: this.computeExpiry() });
  }

  private computeExpiry(): Date {
    const expires = new Date();
    expires.setDate(expires.getDate() + CART_TTL_DAYS);
    return expires;
  }

  private async mapCart(cart: Cart) {
    const items = (cart.items ?? []).map((item) => ({
      id_product: item.id_product,
      name: item.product?.name,
      sales_price: Number(item.product?.sale_price ?? 0),
      quantity: item.quantity,
      in_stock: true,
    }));

    const total = items.reduce(
      (sum, item) => sum + (item.sales_price ?? 0) * item.quantity,
      0,
    );

    return {
      id: cart.id,
      status: cart.status,
      expires_at: cart.expires_at,
      items,
      total,
    };
  }
}
