export function normalizeInvoiceText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toUpperCase();
}
