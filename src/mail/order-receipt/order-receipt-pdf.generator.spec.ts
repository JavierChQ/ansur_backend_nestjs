import { CompanyConfigService } from '../../company-config/company-config.service';
import { OrderReceiptBuilder } from './order-receipt.builder';
import { OrderReceiptPdfGenerator } from './order-receipt-pdf.generator';

jest.mock('../../orders/order-reference.util', () => ({
  getOrderReferenceCode: (order: { reference_code?: string; id: number }) =>
    order.reference_code?.trim().toUpperCase() ?? String(order.id),
}));

describe('OrderReceiptPdfGenerator', () => {
  const companyConfigService = {
    getCompany: jest.fn(() => ({
      name: 'Ansur',
      legalName: 'Ansur Perú S.A.C.',
      ruc: '20600674651',
      address: 'Cal. Garci Carbajal nro 101, int. a-12',
      website: 'https://ansur.com.pe',
      whatsapp: '51947346467',
      whatsappDisplay: '947 346 467',
    })),
  } as unknown as CompanyConfigService;

  const builder = new OrderReceiptBuilder(companyConfigService);
  const generator = new OrderReceiptPdfGenerator();

  it('genera un PDF con contenido no vacío', async () => {
    const view = builder.build({
      id: 1,
      reference_code: 'A1B2C3',
      created_at: new Date('2026-06-16T12:00:00.000Z'),
      customer_name: 'Juan',
      customer_lastname: 'Pérez',
      customer_email: 'juan@example.com',
      delivery_type: 'pickup',
      delivery_fee: 15,
      orderHasProducts: [
        {
          id_order: 1,
          id_product: 1,
          quantity: 1,
          unit_price: 400,
          product: { id: 1, name: 'Memoria Externa SSD', sale_price: 400 },
        },
      ],
    } as never);

    const pdf = await generator.generate(view);

    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.length).toBeGreaterThan(500);
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect(pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)?.length).toBe(2);
  });
});
