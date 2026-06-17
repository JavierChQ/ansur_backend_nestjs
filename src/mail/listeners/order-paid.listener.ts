import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ORDER_PAID_EVENT, OrderPaidEvent } from '../events/order-paid.event';
import { GuestUserProvisioningService } from '../../orders/guest-user-provisioning.service';
import { OrderPaidActivationService } from '../order-paid-activation.service';
import { SalesReceiptService } from '../sales-receipt.service';

@Injectable()
export class OrderPaidListener {
  private readonly logger = new Logger(OrderPaidListener.name);

  constructor(
    private readonly guestUserProvisioningService: GuestUserProvisioningService,
    private readonly orderPaidActivationService: OrderPaidActivationService,
    private readonly salesReceiptService: SalesReceiptService,
  ) {}

  @OnEvent(ORDER_PAID_EVENT, { async: true })
  async handleOrderPaid(event: OrderPaidEvent): Promise<void> {
    try {
      await this.guestUserProvisioningService.provisionUserForOrder(event.orderId);
    } catch (error) {
      this.logger.error(
        `No se pudo provisionar usuario para orden ${event.orderId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    try {
      await this.salesReceiptService.sendReceipt(event.orderId);
    } catch (error) {
      this.logger.error(
        `No se pudo enviar nota de pedido para orden ${event.orderId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    try {
      await this.orderPaidActivationService.sendActivationIfNeeded(event.orderId);
    } catch (error) {
      this.logger.error(
        `No se pudo enviar activación para orden ${event.orderId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
