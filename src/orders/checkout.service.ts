import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order } from './order.entity';
import { OrderHasProducts } from './order_has_products.entity';
import { OrderStatus } from './enums/order-status.enum';
import { CheckoutDto } from './dto/checkout.dto';
import { CartService } from '../cart/cart.service';
import { InventoryService } from '../inventory/inventory.service';
import { CHECKOUT_TTL_MINUTES } from '../common/constants/stock.constants';

@Injectable()
export class CheckoutService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    private cartService: CartService,
    private inventoryService: InventoryService,
    private dataSource: DataSource,
  ) {}

  async checkout(userId: number, dto: CheckoutDto) {
    const cartItems = await this.cartService.getItemsForCheckout(userId);
    const cartId = await this.cartService.getActiveCartId(userId);

    const amount = cartItems.reduce(
      (sum, item) => sum + Number(item.product.sale_price) * item.quantity,
      0,
    );

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + CHECKOUT_TTL_MINUTES);

    const order = await this.dataSource.transaction(async (manager) => {
      const newOrder = manager.create(Order, {
        id_client: userId,
        id_address: dto.id_address,
        amount,
        status: OrderStatus.PENDIENTE_PAGO,
        expires_at: expiresAt,
      });
      const savedOrder = await manager.save(newOrder);

      const orderItems = cartItems.map((item) =>
        manager.create(OrderHasProducts, {
          id_order: savedOrder.id,
          id_product: item.id_product,
          quantity: item.quantity,
        }),
      );
      await manager.save(orderItems);

      await this.inventoryService.reserveForOrder(
        savedOrder.id,
        cartItems.map((item) => ({
          id_product: item.id_product,
          quantity: item.quantity,
        })),
        manager,
      );

      return savedOrder;
    });

    if (cartId) {
      await this.cartService.markCheckedOut(cartId);
    }

    return this.ordersRepository.findOne({
      where: { id: order.id },
      relations: ['orderHasProducts', 'orderHasProducts.product'],
    });
  }
}
