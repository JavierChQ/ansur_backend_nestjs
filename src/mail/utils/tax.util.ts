const DEFAULT_IGV_RATE = 0.18;

export function getIgvRate(): number {
  const configured = Number(process.env.IGV_RATE);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_IGV_RATE;
}

/** Monto con IGV incluido → base imponible */
export function extractTaxableBase(amountWithTax: number, taxRate = getIgvRate()): number {
  return amountWithTax / (1 + taxRate);
}

/** Monto con IGV incluido → monto de IGV */
export function extractTaxAmount(amountWithTax: number, taxRate = getIgvRate()): number {
  return amountWithTax - extractTaxableBase(amountWithTax, taxRate);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(amount);
}
