import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThan, Repository } from 'typeorm';
import { Order } from '../orders/order.entity';
import { OrderStatus } from '../orders/enums/order-status.enum';
import { Cart } from '../cart/entities/cart.entity';
import { CartStatus } from '../cart/enums/cart-status.enum';
import { InventoryService } from './inventory.service';

@Injectable()
export class InventorySchedulerService {
  private readonly logger = new Logger(InventorySchedulerService.name);

  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(Cart)
    private cartsRepository: Repository<Cart>,
    private inventoryService: InventoryService,
    private dataSource: DataSource,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async expireCheckouts() {
    const expired = await this.ordersRepository.find({
      where: {
        status: OrderStatus.PENDIENTE_PAGO,
        expires_at: LessThan(new Date()),
      },
      relations: ['orderHasProducts'],
    });

    for (const order of expired) {
      try {
        await this.dataSource.transaction(async (manager) => {
          const items = order.orderHasProducts.map((ohp) => ({
            id_product: ohp.id_product,
            quantity: ohp.quantity,
          }));
          await this.inventoryService.releaseReservation(
            order.id,
            items,
            manager,
          );
          order.status = OrderStatus.EXPIRADO;
          await manager.save(order);
        });
        this.logger.log(`Checkout expirado: orden #${order.id}`);
      } catch (error) {
        this.logger.error(`Error al expirar orden #${order.id}`, error);
      }
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async expireCarts() {
    const result = await this.cartsRepository.update(
      {
        status: CartStatus.ACTIVE,
        expires_at: LessThan(new Date()),
      },
      { status: CartStatus.ABANDONED },
    );

    if (result.affected > 0) {
      this.logger.log(`${result.affected} carrito(s) marcados como abandonados`);
    }
  }
}
