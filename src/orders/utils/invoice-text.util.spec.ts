import { normalizeInvoiceText } from './invoice-text.util';

describe('invoice-text.util', () => {
  it('normaliza espacios y mayúsculas', () => {
    expect(normalizeInvoiceText('  juan   perez  ')).toBe('JUAN PEREZ');
  });
});
