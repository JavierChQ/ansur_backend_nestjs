import { Injectable, HttpException, HttpStatus, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Order } from './order.entity';
import { OrderStatus } from './enums/order-status.enum';
import { enrichOrderSnapshot } from './order-snapshot.util';
import { generateOrderReferenceCode } from './order-reference.util';

@Injectable()
export class OrdersService implements OnModuleInit {
    private readonly logger = new Logger(OrdersService.name);

    constructor(@InjectRepository(Order) private ordersRepository: Repository<Order>) {}

    async onModuleInit(): Promise<void> {
        await this.backfillMissingReferenceCodes();
    }

    private async backfillMissingReferenceCodes(): Promise<void> {
        const orders = await this.ordersRepository.find({
            where: { reference_code: IsNull() },
            select: ['id'],
        });

        if (!orders.length) {
            return;
        }

        for (const order of orders) {
            let referenceCode = generateOrderReferenceCode();
            for (let attempt = 0; attempt < 5; attempt++) {
                const existing = await this.ordersRepository.findOne({
                    where: { reference_code: referenceCode },
                    select: ['id'],
                });
                if (!existing) {
                    break;
                }
                referenceCode = generateOrderReferenceCode();
            }

            await this.ordersRepository.update(order.id, { reference_code: referenceCode });
        }

        this.logger.log(`Códigos de pedido generados para ${orders.length} orden(es) existente(s).`);
    }

    async findAll() {
    const orders = await this.ordersRepository.find({
      relations: ['user', 'address', 'orderHasProducts', 'orderHasProducts.product'],
      order: { created_at: 'DESC' },
    });
    return orders.map((order) => enrichOrderSnapshot(order));
  }

  async findById(id: number) {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: ['user', 'address', 'orderHasProducts', 'orderHasProducts.product'],
    });
    return order ? enrichOrderSnapshot(order) : null;
  }
    
    async findByClient(idClient: number) {
        const orders = await this.ordersRepository.find({ 
            relations: ['user', 'address', 'orderHasProducts.product'],
            where: { id_client: idClient },
        });
        return orders.map((order) => enrichOrderSnapshot(order));
    }

    async updateStatus(id: number) {
        const orderFound = await this.ordersRepository.findOneBy({id: id});
        if (!orderFound) {
            throw new HttpException('Orden no encontrada', HttpStatus.NOT_FOUND);
        }
        const updatedOrder = Object.assign(orderFound, { status: OrderStatus.DESPACHADO });
        await this.ordersRepository.save(updatedOrder);
        return this.findById(id);
    }
}
