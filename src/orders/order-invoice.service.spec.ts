import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { IdentityService } from '../identity/identity.service';
import { ORDER_INVOICE_ERROR_CODES } from './constants/order-invoice-error-codes.constants';
import {
  CheckoutInvoiceDto,
  InvoiceTypeDto,
} from './dto/checkout-invoice.dto';
import { OrderInvoiceService } from './order-invoice.service';

describe('OrderInvoiceService', () => {
  let service: OrderInvoiceService;
  let identityService: jest.Mocked<Pick<IdentityService, 'lookupDni' | 'lookupRuc'>>;

  beforeEach(async () => {
    identityService = {
      lookupDni: jest.fn(),
      lookupRuc: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderInvoiceService,
        {
          provide: IdentityService,
          useValue: identityService,
        },
      ],
    }).compile();

    service = module.get(OrderInvoiceService);
  });

  it('persiste snapshot de boleta revalidando DNI', async () => {
    identityService.lookupDni.mockResolvedValue({
      doc_type: 'DNI',
      doc_number: '12345678',
      nombres: 'JUAN',
      apellido_paterno: 'PEREZ',
      apellido_materno: 'QUISPE',
      nombre_completo: 'JUAN PEREZ QUISPE',
      validated_at: '2026-06-16T12:00:00.000Z',
      provider: 'apisperu',
    });

    const invoice: CheckoutInvoiceDto = {
      type: InvoiceTypeDto.BOLETA,
      doc_number: '12345678',
      holder_name: 'JUAN PEREZ QUISPE',
    };

    const snapshot = await service.resolveInvoiceSnapshot(invoice);

    expect(snapshot.invoice_type).toBe(InvoiceTypeDto.BOLETA);
    expect(snapshot.invoice_doc_type).toBe('DNI');
    expect(snapshot.invoice_doc_number).toBe('12345678');
    expect(snapshot.invoice_holder_name).toBe('JUAN PEREZ QUISPE');
    expect(snapshot.invoice_validation_source).toBe('apisperu');
    expect(identityService.lookupDni).toHaveBeenCalledWith('12345678');
  });

  it('rechaza boleta si el nombre no coincide con ApisPeru', async () => {
    identityService.lookupDni.mockResolvedValue({
      doc_type: 'DNI',
      doc_number: '12345678',
      nombres: 'JUAN',
      apellido_paterno: 'PEREZ',
      apellido_materno: 'QUISPE',
      nombre_completo: 'JUAN PEREZ QUISPE',
      validated_at: '2026-06-16T12:00:00.000Z',
      provider: 'apisperu',
    });

    await expect(
      service.resolveInvoiceSnapshot({
        type: InvoiceTypeDto.BOLETA,
        doc_number: '12345678',
        holder_name: 'OTRO NOMBRE',
      }),
    ).rejects.toMatchObject({
      response: {
        code: ORDER_INVOICE_ERROR_CODES.INVOICE_DATA_MISMATCH,
      },
    });
  });

  it('persiste snapshot de factura revalidando RUC', async () => {
    identityService.lookupRuc.mockResolvedValue({
      doc_type: 'RUC',
      doc_number: '20131312955',
      razon_social: 'EMPRESA DEMO SAC',
      direccion: 'AV. PRINCIPAL 123',
      departamento: 'LIMA',
      provincia: 'LIMA',
      distrito: 'LIMA',
      estado: 'ACTIVO',
      condicion: 'HABIDO',
      validated_at: '2026-06-16T12:00:00.000Z',
      provider: 'apisperu',
    });

    const snapshot = await service.resolveInvoiceSnapshot({
      type: InvoiceTypeDto.FACTURA,
      doc_number: '20131312955',
      business_name: 'EMPRESA DEMO SAC',
      address: 'AV. PRINCIPAL 123',
    });

    expect(snapshot.invoice_type).toBe(InvoiceTypeDto.FACTURA);
    expect(snapshot.invoice_doc_type).toBe('RUC');
    expect(snapshot.invoice_business_name).toBe('EMPRESA DEMO SAC');
    expect(snapshot.invoice_address).toBe('AV. PRINCIPAL 123');
  });

  it('rechaza factura si razón social o domicilio no coinciden', async () => {
    identityService.lookupRuc.mockResolvedValue({
      doc_type: 'RUC',
      doc_number: '20131312955',
      razon_social: 'EMPRESA DEMO SAC',
      direccion: 'AV. PRINCIPAL 123',
      departamento: 'LIMA',
      provincia: 'LIMA',
      distrito: 'LIMA',
      estado: 'ACTIVO',
      condicion: 'HABIDO',
      validated_at: '2026-06-16T12:00:00.000Z',
      provider: 'apisperu',
    });

    await expect(
      service.resolveInvoiceSnapshot({
        type: InvoiceTypeDto.FACTURA,
        doc_number: '20131312955',
        business_name: 'EMPRESA FALSA SAC',
        address: 'AV. PRINCIPAL 123',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
