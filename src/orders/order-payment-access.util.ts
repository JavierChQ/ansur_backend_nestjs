import { ForbiddenException } from '@nestjs/common';
import { Order } from './order.entity';
import { PaymentAuthContext } from '../common/constants/checkout-auth.constants';

export function assertOrderPaymentAccess(
  order: Order,
  auth: PaymentAuthContext | undefined,
  requestedOrderId: number,
): void {
  if (auth?.checkout) {
    if (auth.checkout.orderId !== requestedOrderId) {
      throw new ForbiddenException('El token no corresponde a esta orden');
    }

    if (!order.is_guest_order) {
      throw new ForbiddenException('Esta orden requiere inicio de sesión');
    }

    if (order.customer_email !== auth.checkout.email) {
      throw new ForbiddenException('El token no corresponde a esta orden');
    }

    return;
  }

  if (auth?.userId) {
    if (order.id_client && order.id_client !== auth.userId) {
      throw new ForbiddenException('No tienes acceso a esta orden');
    }

    if (!order.id_client && order.is_guest_order) {
      throw new ForbiddenException('Esta orden requiere checkout_token');
    }

    return;
  }

  throw new ForbiddenException('Autenticación requerida');
}
