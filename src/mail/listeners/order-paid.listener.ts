import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ORDER_PAID_EVENT, OrderPaidEvent } from '../events/order-paid.event';
import { SalesReceiptService } from '../sales-receipt.service';

@Injectable()
export class OrderPaidListener {
  private readonly logger = new Logger(OrderPaidListener.name);

  constructor(private readonly salesReceiptService: SalesReceiptService) {}

  @OnEvent(ORDER_PAID_EVENT, { async: true })
  async handleOrderPaid(event: OrderPaidEvent): Promise<void> {
    try {
      await this.salesReceiptService.sendReceipt(event.orderId);
    } catch (error) {
      this.logger.error(
        `No se pudo enviar comprobante para orden ${event.orderId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
