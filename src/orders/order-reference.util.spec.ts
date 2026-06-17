import {
  generateOrderReferenceCode,
  isAlphanumericOrderReference,
} from './order-reference.util';

jest.mock('./order.entity', () => ({
  Order: class Order {},
}));

describe('order-reference.util', () => {
  it('genera un código de 6 caracteres con letras y números', () => {
    for (let attempt = 0; attempt < 20; attempt++) {
      const code = generateOrderReferenceCode();
      expect(code).toHaveLength(6);
      expect(isAlphanumericOrderReference(code)).toBe(true);
      expect(/[A-Z]/.test(code)).toBe(true);
      expect(/\d/.test(code)).toBe(true);
    }
  });

  it('rechaza códigos solo con letras o solo con números', () => {
    expect(isAlphanumericOrderReference('AQVAHZ')).toBe(false);
    expect(isAlphanumericOrderReference('123456')).toBe(false);
    expect(isAlphanumericOrderReference('A1B2C3')).toBe(true);
  });
});
