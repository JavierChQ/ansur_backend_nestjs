import { ConfigService } from '@nestjs/config';
import { OrderReceiptBuilder } from './order-receipt.builder';
import { OrderReceiptPdfGenerator } from './order-receipt-pdf.generator';

jest.mock('../../orders/order-reference.util', () => ({
  getOrderReferenceCode: (order: { reference_code?: string; id: number }) =>
    order.reference_code?.trim().toUpperCase() ?? String(order.id),
}));

describe('OrderReceiptPdfGenerator', () => {
  const configService = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        COMPANY_NAME: 'Ansur',
        COMPANY_LEGAL_NAME: 'Ansur Perú S.A.C.',
        COMPANY_RUT: '20600674651',
        COMPANY_ADDRESS: 'Cal. Garci Carbajal nro 101, int. a-12',
        COMPANY_WEBSITE: 'https://ansur.com.pe',
        COMPANY_WHATSAPP: '51947346467',
      };
      return values[key];
    }),
  } as unknown as ConfigService;

  const builder = new OrderReceiptBuilder(configService);
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
