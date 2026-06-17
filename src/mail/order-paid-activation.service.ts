import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PasswordSetupService } from '../auth/password-setup.service';
import { Order } from '../orders/order.entity';
import { getOrderReferenceCode } from '../orders/order-reference.util';

@Injectable()
export class OrderPaidActivationService {
  private readonly logger = new Logger(OrderPaidActivationService.name);

  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    private readonly passwordSetupService: PasswordSetupService,
  ) {}

  async sendActivationIfNeeded(orderId: number): Promise<void> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: ['user'],
    });

    if (!order?.id_client) {
      this.logger.warn(`Orden ${orderId} sin cliente; activación omitida`);
      return;
    }

    if (!order.user?.password_not_set) {
      return;
    }

    await this.passwordSetupService.createAndSendActivationEmail(
      order.id_client,
      getOrderReferenceCode(order),
    );
  }
}
