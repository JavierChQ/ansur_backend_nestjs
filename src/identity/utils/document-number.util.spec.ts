import {
  isValidDniFormat,
  isValidRucFormat,
  normalizeDocumentNumber,
} from './document-number.util';

describe('document-number.util', () => {
  describe('normalizeDocumentNumber', () => {
    it('elimina espacios', () => {
      expect(normalizeDocumentNumber(' 12345678 ')).toBe('12345678');
    });
  });

  describe('isValidDniFormat', () => {
    it('acepta 8 dígitos', () => {
      expect(isValidDniFormat('12345678')).toBe(true);
    });

    it('rechaza longitud incorrecta', () => {
      expect(isValidDniFormat('1234567')).toBe(false);
      expect(isValidDniFormat('123456789')).toBe(false);
    });

    it('rechaza caracteres no numéricos', () => {
      expect(isValidDniFormat('1234567A')).toBe(false);
    });
  });

  describe('isValidRucFormat', () => {
    it('acepta 11 dígitos', () => {
      expect(isValidRucFormat('20131312955')).toBe(true);
    });

    it('rechaza longitud incorrecta', () => {
      expect(isValidRucFormat('2013131295')).toBe(false);
      expect(isValidRucFormat('201313129555')).toBe(false);
    });

    it('rechaza caracteres no numéricos', () => {
      expect(isValidRucFormat('2013131295A')).toBe(false);
    });
  });
});
