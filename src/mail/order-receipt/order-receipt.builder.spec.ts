import { CompanyConfigService } from '../../company-config/company-config.service';
import { Order } from '../../orders/order.entity';
import { OrderHasProducts } from '../../orders/order_has_products.entity';
import { Product } from '../../products/product.entity';
import { OrderReceiptBuilder } from './order-receipt.builder';

jest.mock('../../orders/order-reference.util', () => ({
  getOrderReferenceCode: (order: { reference_code?: string; id: number }) =>
    order.reference_code?.trim().toUpperCase() ?? String(order.id),
}));

describe('OrderReceiptBuilder', () => {
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

  function createOrder(overrides: Partial<Order> = {}): Order {
    const product = { id: 1, name: 'Producto A', sale_price: 50 } as Product;
    const line = {
      id_order: 1,
      id_product: 1,
      quantity: 2,
      unit_price: 50,
      product,
    } as OrderHasProducts;

    return {
      id: 1,
      reference_code: 'ABC123',
      created_at: new Date('2026-06-16T12:00:00.000Z'),
      customer_name: 'Juan',
      customer_lastname: 'Pérez',
      customer_email: 'juan@example.com',
      customer_phone: '947346467',
      delivery_type: 'delivery',
      delivery_fee: 10,
      direccion: 'Av. Ejemplo 123',
      distrito: 'Miraflores',
      provincia: 'Lima',
      departamento: 'Lima',
      receptor_nombres: 'María',
      receptor_apellidos: 'López',
      invoice_type: 'BOLETA',
      invoice_doc_type: 'DNI',
      invoice_doc_number: '12345678',
      invoice_holder_name: 'JUAN PEREZ',
      orderHasProducts: [line],
      ...overrides,
    } as Order;
  }

  it('construye la vista con totales y datos de entrega', () => {
    const view = builder.build(createOrder());

    expect(view.orderReference).toBe('ABC123');
    expect(view.paymentMethodLabel).toBe('Mercado Pago');
    expect(view.paymentStatusLabel).toBe('Confirmado');
    expect(view.deliveryTypeLabel).toBe('A domicilio');
    expect(view.deliveryAddress).toBe('Av. Ejemplo 123');
    expect(view.deliveryUbigeo).toBe('Miraflores, Lima, Lima');
    expect(view.deliveryContact).toBe('María López - 947 346 467');
    expect(view.subtotalProducts).toBe(100);
    expect(view.deliveryFee).toBe(10);
    expect(view.grandTotal).toBe(110);
    expect(view.invoice?.typeLabel).toBe('Boleta');
    expect(view.company.whatsappDisplay).toBe('947 346 467');
  });

  it('usa retiro en tienda cuando delivery_type es pickup', () => {
    const view = builder.build(
      createOrder({
        delivery_type: 'pickup',
        direccion: undefined,
        distrito: undefined,
        provincia: undefined,
        departamento: undefined,
      }),
    );

    expect(view.deliveryTypeLabel).toBe('Retiro en tienda');
    expect(view.deliveryUbigeo).toBe('—');
    expect(view.deliveryAddress).toBe('Cal. Garci Carbajal nro 101, int. a-12');
  });
});
