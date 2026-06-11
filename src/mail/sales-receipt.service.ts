import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../orders/order.entity';
import { MailService } from './mail.service';
import {
  extractTaxableBase,
  extractTaxAmount,
  formatCurrency,
  getIgvRate,
} from './utils/tax.util';

@Injectable()
export class SalesReceiptService {
  private readonly logger = new Logger(SalesReceiptService.name);

  constructor(
    @InjectRepository(Order) private readonly ordersRepository: Repository<Order>,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async sendReceipt(orderId: number): Promise<void> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: ['user', 'address', 'orderHasProducts', 'orderHasProducts.product'],
    });

    if (!order) {
      this.logger.warn(`Orden ${orderId} no encontrada; comprobante omitido.`);
      return;
    }

    if (order.receipt_sent_at) {
      this.logger.log(`Comprobante de orden ${orderId} ya enviado; omitiendo duplicado.`);
      return;
    }

    if (!order.user?.email) {
      this.logger.warn(`Orden ${orderId} sin email de usuario; comprobante omitido.`);
      return;
    }

    const html = this.buildReceiptHtml(order);
    const subject = `Comprobante de compra #${order.id} - ${this.getCompanyName()}`;

    await this.mailService.sendHtmlEmail(order.user.email, subject, html);

    order.receipt_sent_at = new Date();
    await this.ordersRepository.save(order);

    this.logger.log(`Comprobante enviado para orden ${orderId} → ${order.user.email}`);
  }

  private getCompanyName(): string {
    return this.configService.get<string>('COMPANY_NAME') ?? 'Ansur';
  }

  private buildReceiptHtml(order: Order): string {
    const companyName = this.getCompanyName();
    const companyRut = this.configService.get<string>('COMPANY_RUT');
    const companyAddress = this.configService.get<string>('COMPANY_ADDRESS');
    const igvRate = getIgvRate();
    const igvPercent = Math.round(igvRate * 100);

    let totalBase = 0;
    let totalIgv = 0;
    let totalWithTax = 0;

    const lineRows = (order.orderHasProducts ?? []).map((line) => {
      const unitPrice = Number(line.unit_price ?? line.product?.sale_price ?? 0);
      const lineTotal = unitPrice * line.quantity;
      const lineBase = extractTaxableBase(lineTotal, igvRate);
      const lineIgv = extractTaxAmount(lineTotal, igvRate);

      totalBase += lineBase;
      totalIgv += lineIgv;
      totalWithTax += lineTotal;

      return `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #eee;">${this.escapeHtml(line.product?.name ?? `Producto #${line.id_product}`)}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${line.quantity}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${formatCurrency(unitPrice)}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${formatCurrency(lineBase)}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${formatCurrency(lineIgv)}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${formatCurrency(lineTotal)}</td>
        </tr>
      `;
    }).join('');

    const orderDate = new Date(order.created_at).toLocaleString('es-PE', {
      dateStyle: 'long',
      timeStyle: 'short',
    });

    const customerName = `${order.user.name} ${order.user.lastname}`.trim();
    const deliveryAddress = order.address
      ? `${order.address.address}, ${order.address.district}`
      : '—';

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Comprobante #${order.id}</title>
</head>
<body style="font-family:Arial,sans-serif;color:#222;line-height:1.5;max-width:640px;margin:0 auto;padding:24px;">
  <h1 style="color:#1a1a1a;margin-bottom:4px;">${this.escapeHtml(companyName)}</h1>
  ${companyRut ? `<p style="margin:0;color:#555;">RUC: ${this.escapeHtml(companyRut)}</p>` : ''}
  ${companyAddress ? `<p style="margin:0;color:#555;">${this.escapeHtml(companyAddress)}</p>` : ''}

  <hr style="border:none;border-top:1px solid #ddd;margin:20px 0;">

  <h2 style="margin-top:0;">Comprobante de compra #${order.id}</h2>
  <p style="margin:4px 0;"><strong>Fecha:</strong> ${orderDate}</p>
  <p style="margin:4px 0;"><strong>Cliente:</strong> ${this.escapeHtml(customerName)}</p>
  <p style="margin:4px 0;"><strong>Correo:</strong> ${this.escapeHtml(order.user.email)}</p>
  <p style="margin:4px 0;"><strong>Entrega:</strong> ${this.escapeHtml(deliveryAddress)}</p>
  ${order.payment_id ? `<p style="margin:4px 0;"><strong>Pago Mercado Pago:</strong> ${this.escapeHtml(order.payment_id)}</p>` : ''}

  <table style="width:100%;border-collapse:collapse;margin:24px 0;font-size:14px;">
    <thead>
      <tr style="background:#f5f5f5;">
        <th style="padding:8px;text-align:left;">Producto</th>
        <th style="padding:8px;text-align:center;">Cant.</th>
        <th style="padding:8px;text-align:right;">P. unit. (inc. IGV)</th>
        <th style="padding:8px;text-align:right;">Base</th>
        <th style="padding:8px;text-align:right;">IGV (${igvPercent}%)</th>
        <th style="padding:8px;text-align:right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${lineRows}
    </tbody>
  </table>

  <table style="width:100%;max-width:320px;margin-left:auto;font-size:14px;">
    <tr>
      <td style="padding:4px 8px;">Subtotal (base imponible)</td>
      <td style="padding:4px 8px;text-align:right;">${formatCurrency(totalBase)}</td>
    </tr>
    <tr>
      <td style="padding:4px 8px;">IGV (${igvPercent}%)</td>
      <td style="padding:4px 8px;text-align:right;">${formatCurrency(totalIgv)}</td>
    </tr>
    <tr style="font-weight:bold;font-size:16px;">
      <td style="padding:8px;border-top:2px solid #222;">Total (inc. IGV)</td>
      <td style="padding:8px;border-top:2px solid #222;text-align:right;">${formatCurrency(totalWithTax)}</td>
    </tr>
  </table>

  <p style="margin-top:32px;font-size:12px;color:#666;">
    Este documento es un comprobante comercial de tu compra en ${this.escapeHtml(companyName)}.
    Los precios incluyen IGV. No constituye comprobante de pago electrónico timbrado ante SUNAT.
  </p>
</body>
</html>
    `.trim();
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
