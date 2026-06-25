import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CompanyConfigService } from '../company-config/company-config.service';
import { PaymentAuthContext } from '../common/constants/checkout-auth.constants';
import { getOrderReferenceCode } from './order-reference.util';
import { assertOrderPaymentAccess } from './order-payment-access.util';
import { OrderPaymentService } from './order-payment.service';
import { Order } from './order.entity';

export interface WhatsappPaymentIntentResult {
  order_id: number;
  reference_code: string;
  amount: number;
  expires_at: Date;
  payment_channel: string;
  whatsapp_intent_at: Date;
  message: string;
  whatsapp_url: string;
}

@Injectable()
export class WhatsappPaymentService {
  constructor(
    private readonly orderPaymentService: OrderPaymentService,
    private readonly companyConfigService: CompanyConfigService,
    private readonly configService: ConfigService,
  ) {}

  async registerIntent(
    orderId: number,
    auth: PaymentAuthContext,
  ): Promise<WhatsappPaymentIntentResult> {
    const order = await this.orderPaymentService.findPendingOrder(orderId);
    assertOrderPaymentAccess(order, auth, orderId);

    const saved = await this.orderPaymentService.registerWhatsappIntent(order);
    const message = this.buildCheckoutMessage(saved);
    const whatsappBaseUrl = this.companyConfigService.getContactConfig().whatsappUrl;

    return {
      order_id: saved.id,
      reference_code: getOrderReferenceCode(saved),
      amount: Number(saved.amount),
      expires_at: saved.expires_at,
      payment_channel: saved.payment_channel,
      whatsapp_intent_at: saved.whatsapp_intent_at,
      message,
      whatsapp_url: `${whatsappBaseUrl}?text=${encodeURIComponent(message)}`,
    };
  }

  async resetMercadoPagoCheckout(
    orderId: number,
    auth: PaymentAuthContext,
  ): Promise<{ order_id: number; expires_at: Date; payment_channel: string | null }> {
    const order = await this.orderPaymentService.findPendingOrder(orderId);
    assertOrderPaymentAccess(order, auth, orderId);
    this.orderPaymentService.assertPendingCheckout(order);

    const saved = await this.orderPaymentService.resetToMercadoPagoCheckout(order);

    return {
      order_id: saved.id,
      expires_at: saved.expires_at,
      payment_channel: null,
    };
  }

  buildCheckoutMessage(order: Order): string {
    const referenceCode = getOrderReferenceCode(order);
    const customerName = this.resolveCustomerName(order);
    const deliveryLabel = this.resolveDeliveryLabel(order);
    const productLines = (order.orderHasProducts ?? [])
      .map((line) => {
        const name = line.product?.name ?? `Producto ${line.id_product}`;
        return `- ${name} x${line.quantity}`;
      })
      .join('\n');

    const companyName =
      this.configService.get<string>('COMPANY_NAME')?.trim() || 'Ansur';

    return [
      `Hola, quiero pagar mi pedido en ${companyName}.`,
      '',
      `Código: ${referenceCode}`,
      `Total: S/ ${Number(order.amount).toFixed(2)}`,
      `Nombre: ${customerName}`,
      `Entrega: ${deliveryLabel}`,
      '',
      'Productos:',
      productLines || '- (sin detalle)',
      '',
      'Adjuntaré mi comprobante de pago.',
    ].join('\n');
  }

  buildCustomerWhatsappUrl(phone: string, message: string): string | null {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 9) {
      return null;
    }

    const normalized = digits.startsWith('51') ? digits : `51${digits.slice(-9)}`;
    return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
  }

  private resolveCustomerName(order: Order): string {
    if (order.customer_name || order.customer_lastname) {
      return `${order.customer_name ?? ''} ${order.customer_lastname ?? ''}`.trim();
    }

    return `${order.user?.name ?? ''} ${order.user?.lastname ?? ''}`.trim() || 'Cliente';
  }

  private resolveDeliveryLabel(order: Order): string {
    if (order.delivery_type === 'pickup') {
      return 'Retiro en tienda';
    }

    if (order.delivery_type === 'delivery') {
      const parts = [order.distrito, order.provincia, order.departamento].filter(Boolean);
      return parts.length ? `Delivery a ${parts.join(', ')}` : 'Delivery a domicilio';
    }

    return 'Por confirmar';
  }
}
