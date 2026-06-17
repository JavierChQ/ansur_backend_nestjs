import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Order } from '../../orders/order.entity';
import { getOrderReferenceCode } from '../../orders/order-reference.util';
import { formatCurrency, getIgvRate } from '../utils/tax.util';
import {
  ORDER_RECEIPT_LEGAL_NOTICE,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_CONFIRMED,
} from './order-receipt.constants';
import { OrderReceiptInvoice, OrderReceiptView } from './order-receipt.types';

@Injectable()
export class OrderReceiptBuilder {
  constructor(private readonly configService: ConfigService) {}

  build(order: Order): OrderReceiptView {
    const igvRate = getIgvRate();
    const igvPercent = Math.round(igvRate * 100);
    const lines = (order.orderHasProducts ?? []).map((line) => {
      const unitPrice = Number(line.unit_price ?? line.product?.sale_price ?? 0);
      const lineTotal = unitPrice * line.quantity;

      return {
        description: line.product?.name ?? `Producto ${line.id_product}`,
        quantity: line.quantity,
        unitPrice,
        lineTotal,
      };
    });

    const subtotalProducts = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    const deliveryFee = Number(order.delivery_fee ?? 0);
    const grandTotal = subtotalProducts + deliveryFee;

    return {
      orderReference: getOrderReferenceCode(order),
      orderDate: this.formatOrderDate(order.created_at),
      customerName: this.resolveCustomerName(order),
      customerEmail: order.customer_email ?? order.user?.email ?? '—',
      paymentMethodLabel: PAYMENT_METHOD_LABEL,
      paymentStatusLabel: PAYMENT_STATUS_CONFIRMED,
      deliveryTypeLabel: this.resolveDeliveryTypeLabel(order),
      deliveryAddress: this.resolveDeliveryAddress(order),
      deliveryUbigeo: this.resolveDeliveryUbigeo(order),
      deliveryContact: this.resolveDeliveryContact(order),
      invoice: this.buildInvoice(order),
      lines,
      subtotalProducts,
      deliveryFee,
      grandTotal,
      company: this.buildCompany(),
      legalNotice: ORDER_RECEIPT_LEGAL_NOTICE,
      igvPercent,
    };
  }

  formatCurrency(amount: number): string {
    return formatCurrency(amount);
  }

  private buildCompany(): OrderReceiptView['company'] {
    const whatsapp = this.configService.get<string>('COMPANY_WHATSAPP') ?? '51947346467';
    const whatsappDisplay = this.formatWhatsappDisplay(whatsapp);

    return {
      name: this.configService.get<string>('COMPANY_NAME') ?? 'Ansur',
      legalName:
        this.configService.get<string>('COMPANY_LEGAL_NAME') ?? 'Ansur Perú S.A.C.',
      ruc: this.configService.get<string>('COMPANY_RUT') ?? '20600674651',
      address:
        this.configService.get<string>('COMPANY_ADDRESS') ??
        'Cal. Garci Carbajal nro 101, int. a-12',
      website: this.configService.get<string>('COMPANY_WEBSITE') ?? 'https://ansur.com.pe',
      whatsapp,
      whatsappDisplay,
    };
  }

  private buildInvoice(order: Order): OrderReceiptInvoice | undefined {
    if (!order.invoice_type || !order.invoice_doc_number) {
      return undefined;
    }

    const typeLabel = order.invoice_type === 'FACTURA' ? 'Factura' : 'Boleta';
    const documentLabel = `${order.invoice_doc_type ?? (order.invoice_type === 'FACTURA' ? 'RUC' : 'DNI')} ${order.invoice_doc_number}`;

    if (order.invoice_type === 'FACTURA') {
      return {
        typeLabel,
        documentLabel,
        holderLabel: 'Razón social',
        holderValue: order.invoice_business_name ?? '—',
        addressLabel: 'Domicilio fiscal',
        addressValue: order.invoice_address ?? '—',
      };
    }

    return {
      typeLabel,
      documentLabel,
      holderLabel: 'Titular',
      holderValue: order.invoice_holder_name ?? '—',
    };
  }

  private resolveCustomerName(order: Order): string {
    if (order.customer_name || order.customer_lastname) {
      return `${order.customer_name ?? ''} ${order.customer_lastname ?? ''}`.trim();
    }

    return `${order.user?.name ?? ''} ${order.user?.lastname ?? ''}`.trim() || 'Cliente';
  }

  private formatOrderDate(date: Date): string {
    return new Date(date).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  private resolveDeliveryTypeLabel(order: Order): string {
    return order.delivery_type === 'pickup' ? 'Retiro en tienda' : 'A domicilio';
  }

  private resolveDeliveryAddress(order: Order): string {
    if (order.delivery_type === 'pickup') {
      return this.configService.get<string>('COMPANY_ADDRESS') ?? '—';
    }

    if (order.direccion) {
      const parts = [order.direccion];
      if (order.referencia) {
        parts.push(`Ref: ${order.referencia}`);
      }
      return parts.join(', ');
    }

    if (order.address?.address) {
      return order.address.address;
    }

    return '—';
  }

  private resolveDeliveryUbigeo(order: Order): string {
    if (order.delivery_type === 'pickup') {
      return '—';
    }

    const parts = [order.distrito, order.provincia, order.departamento].filter(Boolean);
    if (parts.length) {
      return parts.join(', ');
    }

    if (order.address?.district) {
      return order.address.district;
    }

    return '—';
  }

  private resolveDeliveryContact(order: Order): string {
    const receptorName = `${order.receptor_nombres ?? ''} ${order.receptor_apellidos ?? ''}`.trim();
    const phone = order.customer_phone?.trim();

    if (receptorName && phone) {
      return `${receptorName} - ${this.formatPhoneDisplay(phone)}`;
    }

    if (receptorName) {
      return receptorName;
    }

    if (phone) {
      return this.formatPhoneDisplay(phone);
    }

    return '—';
  }

  private formatPhoneDisplay(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 9) {
      return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    }

    return phone;
  }

  private formatWhatsappDisplay(whatsapp: string): string {
    const digits = whatsapp.replace(/\D/g, '');
    if (digits.startsWith('51') && digits.length === 11) {
      const local = digits.slice(2);
      return `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
    }

    return this.formatPhoneDisplay(whatsapp);
  }
}
