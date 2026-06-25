import {
  ConflictException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CHECKOUT_TTL_MINUTES,
  WHATSAPP_CHECKOUT_TTL_HOURS,
} from '../common/constants/stock.constants';
import { InventoryService } from '../inventory/inventory.service';
import { ORDER_PAID_EVENT, OrderPaidEvent } from '../mail/events/order-paid.event';
import { OrderStatus } from './enums/order-status.enum';
import { PaymentChannel } from './enums/payment-channel.enum';
import { Order } from './order.entity';

interface OrderItemInput {
  id_product: number;
  quantity: number;
}

export interface ConfirmOrderPaidOptions {
  paymentId: string;
  paymentChannel: PaymentChannel;
  confirmedBy?: number;
  notes?: string;
}

export interface CancelPendingOrderOptions {
  cancelledBy?: number;
  notes?: string;
}

@Injectable()
export class OrderPaymentService {
  private readonly logger = new Logger(OrderPaymentService.name);

  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    private readonly inventoryService: InventoryService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findPendingOrder(orderId: number): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: ['orderHasProducts', 'orderHasProducts.product', 'user'],
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    return order;
  }

  assertPendingCheckout(order: Order): void {
    if (order.status !== OrderStatus.PENDIENTE_PAGO) {
      throw new ConflictException('La orden no está pendiente de pago');
    }

    if (order.expires_at && order.expires_at.getTime() < Date.now()) {
      throw new GoneException('El checkout ha expirado');
    }
  }

  async resetToMercadoPagoCheckout(order: Order): Promise<Order> {
    if (order.status !== OrderStatus.PENDIENTE_PAGO) {
      return order;
    }

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + CHECKOUT_TTL_MINUTES);

    order.payment_channel = null;
    order.whatsapp_intent_at = null;
    order.expires_at = expiresAt;

    return this.ordersRepository.save(order);
  }

  async registerWhatsappIntent(order: Order): Promise<Order> {
    this.assertPendingCheckout(order);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + WHATSAPP_CHECKOUT_TTL_HOURS);

    order.payment_channel = PaymentChannel.WHATSAPP;
    order.whatsapp_intent_at = new Date();
    order.expires_at = expiresAt;

    return this.ordersRepository.save(order);
  }

  async confirmOrderPaid(
    order: Order,
    options: ConfirmOrderPaidOptions,
  ): Promise<Order> {
    if (order.status === OrderStatus.PAGADO) {
      if (order.payment_id === options.paymentId) {
        this.logger.debug(`Orden ${order.id} ya pagada con pago ${options.paymentId}`);
        return order;
      }

      throw new ConflictException('La orden ya fue pagada con otro método');
    }

    if (order.status !== OrderStatus.PENDIENTE_PAGO) {
      throw new ConflictException('La orden no está pendiente de pago');
    }

    const orderItems = this.mapOrderItems(order);
    await this.inventoryService.confirmSale(order.id, orderItems);

    order.status = OrderStatus.PAGADO;
    order.payment_id = options.paymentId;
    order.payment_channel = options.paymentChannel;
    order.payment_confirmed_at = new Date();
    order.payment_confirmed_by = options.confirmedBy ?? null;
    order.payment_notes = options.notes?.trim() || null;

    const saved = await this.ordersRepository.save(order);
    this.eventEmitter.emit(
      ORDER_PAID_EVENT,
      new OrderPaidEvent(saved.id, options.paymentId),
    );
    this.logger.log(`Orden ${saved.id} marcada PAGADO (${options.paymentChannel})`);

    return saved;
  }

  async cancelPendingOrder(
    order: Order,
    options: CancelPendingOrderOptions = {},
  ): Promise<Order> {
    if (order.status === OrderStatus.CANCELADO) {
      return order;
    }

    if (order.status !== OrderStatus.PENDIENTE_PAGO) {
      throw new ConflictException('Solo se pueden cancelar órdenes pendientes de pago');
    }

    const orderItems = this.mapOrderItems(order);
    await this.inventoryService.releaseReservation(order.id, orderItems);

    order.status = OrderStatus.CANCELADO;
    order.payment_notes = options.notes?.trim() || order.payment_notes;
    order.payment_confirmed_by = options.cancelledBy ?? order.payment_confirmed_by;

    const saved = await this.ordersRepository.save(order);
    this.logger.log(`Orden ${saved.id} cancelada manualmente`);

    return saved;
  }

  mapOrderItems(order: Order): OrderItemInput[] {
    return (order.orderHasProducts ?? []).map((line) => ({
      id_product: line.id_product,
      quantity: line.quantity,
    }));
  }
}
