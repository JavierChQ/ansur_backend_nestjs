import { Order } from './order.entity';

export function getOrderProductsSubtotal(order: Order): number {
  return (order.orderHasProducts ?? []).reduce((sum, line) => {
    const unitPrice = Number(line.unit_price ?? line.product?.sale_price ?? 0);
    return sum + unitPrice * line.quantity;
  }, 0);
}
