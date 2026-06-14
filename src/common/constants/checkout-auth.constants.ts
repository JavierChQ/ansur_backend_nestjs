export const CHECKOUT_JWT_SUB = 'checkout';

export interface CheckoutAuthContext {
  orderId: number;
  email: string;
}

export interface PaymentAuthContext {
  userId?: number;
  checkout?: CheckoutAuthContext;
}
