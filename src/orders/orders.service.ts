import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './order.entity';
import { OrderStatus } from './enums/order-status.enum';
import { enrichOrderSnapshot } from './order-snapshot.util';

@Injectable()
export class OrdersService {

    constructor(@InjectRepository(Order) private ordersRepository: Repository<Order>) {}

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
