export interface OrderReceiptLine {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface OrderReceiptInvoice {
  typeLabel: string;
  documentLabel: string;
  holderLabel: string;
  holderValue: string;
  addressLabel?: string;
  addressValue?: string;
}

export interface OrderReceiptCompany {
  name: string;
  legalName: string;
  ruc: string;
  address: string;
  website: string;
  whatsapp: string;
  whatsappDisplay: string;
}

export interface OrderReceiptView {
  orderReference: string;
  orderDate: string;
  customerName: string;
  customerEmail: string;
  paymentMethodLabel: string;
  paymentStatusLabel: string;
  deliveryTypeLabel: string;
  deliveryAddress: string;
  deliveryUbigeo: string;
  deliveryContact: string;
  invoice?: OrderReceiptInvoice;
  lines: OrderReceiptLine[];
  subtotalProducts: number;
  deliveryFee: number;
  grandTotal: number;
  company: OrderReceiptCompany;
  legalNotice: string;
  igvPercent: number;
}
