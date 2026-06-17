export const ORDER_INVOICE_ERROR_CODES = {
  INVOICE_DATA_MISMATCH: 'INVOICE_DATA_MISMATCH',
} as const;

export type OrderInvoiceErrorCode =
  (typeof ORDER_INVOICE_ERROR_CODES)[keyof typeof ORDER_INVOICE_ERROR_CODES];
