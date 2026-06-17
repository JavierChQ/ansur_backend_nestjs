import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../orders/order.entity';
import {
  createUniqueOrderReferenceCode,
  isAlphanumericOrderReference,
} from '../orders/order-reference.util';
import { EmailAttachment, MailService } from './mail.service';
import { OrderReceiptBuilder } from './order-receipt/order-receipt.builder';
import { OrderReceiptHtmlRenderer } from './order-receipt/order-receipt-html.renderer';
import { OrderReceiptPdfGenerator } from './order-receipt/order-receipt-pdf.generator';

@Injectable()
export class SalesReceiptService {
  private readonly logger = new Logger(SalesReceiptService.name);

  constructor(
    @InjectRepository(Order) private readonly ordersRepository: Repository<Order>,
    private readonly mailService: MailService,
    private readonly receiptBuilder: OrderReceiptBuilder,
    private readonly htmlRenderer: OrderReceiptHtmlRenderer,
    private readonly pdfGenerator: OrderReceiptPdfGenerator,
  ) {}

  async sendReceipt(orderId: number): Promise<void> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: ['user', 'address', 'orderHasProducts', 'orderHasProducts.product'],
    });

    if (!order) {
      this.logger.warn(`Orden ${orderId} no encontrada; nota de pedido omitida.`);
      return;
    }

    if (order.receipt_sent_at) {
      this.logger.log(`Nota de pedido de orden ${orderId} ya enviada; omitiendo duplicado.`);
      return;
    }

    const recipientEmail = order.user?.email ?? order.customer_email;
    if (!recipientEmail) {
      this.logger.warn(`Orden ${orderId} sin email; nota de pedido omitida.`);
      return;
    }

    await this.ensureOrderReferenceCode(order);

    const view = this.receiptBuilder.build(order);
    const html = this.htmlRenderer.render(view);
    const pdf = await this.pdfGenerator.generate(view);
    const subject = `Nota de pedido ${view.orderReference} - ${view.company.name}`;
    const attachments: EmailAttachment[] = [
      {
        filename: `nota-pedido-${view.orderReference}.pdf`,
        content: pdf,
        contentType: 'application/pdf',
      },
    ];

    await this.mailService.sendHtmlEmailWithAttachments(
      recipientEmail,
      subject,
      html,
      attachments,
    );

    order.receipt_sent_at = new Date();
    await this.ordersRepository.save(order);

    this.logger.log(`Nota de pedido enviada para orden ${orderId} → ${recipientEmail}`);
  }

  private async ensureOrderReferenceCode(order: Order): Promise<void> {
    const currentCode = order.reference_code?.trim().toUpperCase();
    if (currentCode && isAlphanumericOrderReference(currentCode)) {
      order.reference_code = currentCode;
      return;
    }

    order.reference_code = await createUniqueOrderReferenceCode(this.ordersRepository.manager);
    await this.ordersRepository.save(order);
  }
}
