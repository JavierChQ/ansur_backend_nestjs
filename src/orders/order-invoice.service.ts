import { BadRequestException, Injectable } from '@nestjs/common';
import { IdentityService } from '../identity/identity.service';
import { ORDER_INVOICE_ERROR_CODES } from './constants/order-invoice-error-codes.constants';
import {
  CheckoutInvoiceDto,
  InvoiceTypeDto,
} from './dto/checkout-invoice.dto';
import { Order } from './order.entity';
import { normalizeInvoiceText } from './utils/invoice-text.util';

@Injectable()
export class OrderInvoiceService {
  constructor(private readonly identityService: IdentityService) {}

  async resolveInvoiceSnapshot(
    invoice: CheckoutInvoiceDto,
  ): Promise<Partial<Order>> {
    if (invoice.type === InvoiceTypeDto.BOLETA) {
      return this.resolveBoleta(invoice);
    }

    return this.resolveFactura(invoice);
  }

  private async resolveBoleta(
    invoice: CheckoutInvoiceDto,
  ): Promise<Partial<Order>> {
    const dniResult = await this.identityService.lookupDni(invoice.doc_number);
    const submittedHolderName = invoice.holder_name?.trim();

    if (!submittedHolderName) {
      throw new BadRequestException({
        code: ORDER_INVOICE_ERROR_CODES.INVOICE_DATA_MISMATCH,
        message: 'El nombre del titular es obligatorio para boleta.',
      });
    }

    if (
      normalizeInvoiceText(submittedHolderName) !==
      normalizeInvoiceText(dniResult.nombre_completo)
    ) {
      throw new BadRequestException({
        code: ORDER_INVOICE_ERROR_CODES.INVOICE_DATA_MISMATCH,
        message:
          'Los datos del comprobante no coincidieron con la consulta oficial del DNI.',
      });
    }

    return {
      invoice_type: InvoiceTypeDto.BOLETA,
      invoice_doc_type: 'DNI',
      invoice_doc_number: dniResult.doc_number,
      invoice_holder_name: dniResult.nombre_completo,
      invoice_business_name: null,
      invoice_address: null,
      invoice_validated_at: new Date(dniResult.validated_at),
      invoice_validation_source: dniResult.provider,
    };
  }

  private async resolveFactura(
    invoice: CheckoutInvoiceDto,
  ): Promise<Partial<Order>> {
    const rucResult = await this.identityService.lookupRuc(invoice.doc_number);
    const submittedBusinessName = invoice.business_name?.trim();
    const submittedAddress = invoice.address?.trim();

    if (!submittedBusinessName || !submittedAddress) {
      throw new BadRequestException({
        code: ORDER_INVOICE_ERROR_CODES.INVOICE_DATA_MISMATCH,
        message: 'La razón social y domicilio fiscal son obligatorios para factura.',
      });
    }

    if (
      normalizeInvoiceText(submittedBusinessName) !==
        normalizeInvoiceText(rucResult.razon_social) ||
      normalizeInvoiceText(submittedAddress) !==
        normalizeInvoiceText(rucResult.direccion)
    ) {
      throw new BadRequestException({
        code: ORDER_INVOICE_ERROR_CODES.INVOICE_DATA_MISMATCH,
        message:
          'Los datos del comprobante no coincidieron con la consulta oficial del RUC.',
      });
    }

    return {
      invoice_type: InvoiceTypeDto.FACTURA,
      invoice_doc_type: 'RUC',
      invoice_doc_number: rucResult.doc_number,
      invoice_holder_name: null,
      invoice_business_name: rucResult.razon_social,
      invoice_address: rucResult.direccion,
      invoice_validated_at: new Date(rucResult.validated_at),
      invoice_validation_source: rucResult.provider,
    };
  }
}
