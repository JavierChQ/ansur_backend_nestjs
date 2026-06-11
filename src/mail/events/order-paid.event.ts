export class OrderPaidEvent {
  constructor(
    readonly orderId: number,
    readonly paymentId: string,
  ) {}
}

export const ORDER_PAID_EVENT = 'order.paid';
