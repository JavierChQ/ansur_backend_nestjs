const DNI_PATTERN = /^\d{8}$/;
const RUC_PATTERN = /^\d{11}$/;

export function normalizeDocumentNumber(value: string): string {
  return value.trim().replace(/\s+/g, '');
}

export function isValidDniFormat(value: string): boolean {
  return DNI_PATTERN.test(normalizeDocumentNumber(value));
}

export function isValidRucFormat(value: string): boolean {
  return RUC_PATTERN.test(normalizeDocumentNumber(value));
}
