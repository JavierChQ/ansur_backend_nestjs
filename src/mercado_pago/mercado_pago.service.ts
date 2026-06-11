import { HttpService } from '@nestjs/axios/dist';
import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosResponse, AxiosError } from 'axios';
import { catchError, firstValueFrom, map } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MERCADO_PAGO_API } from 'src/config/config';
import { Installment } from './models/installment';
import { CardTokenBody } from './models/card_token_body';
import { CardTokenResponse } from './models/card_token_response';
import { PaymentResponse } from './models/payment_response';
import { PaymentBody } from './models/payment_body';
import { Repository } from 'typeorm';
import { Order } from 'src/orders/order.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { OrderStatus } from '../orders/enums/order-status.enum';
import { InventoryService } from '../inventory/inventory.service';
import { ORDER_PAID_EVENT, OrderPaidEvent } from '../mail/events/order-paid.event';
import { MercadoPagoWebhookDto } from './dto/mercado-pago-webhook.dto';
import { validateMercadoPagoWebhookSignature } from './utils/webhook-signature.util';

interface OrderItemInput {
  id_product: number;
  quantity: number;
}

@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);

  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(Order) private ordersRepository: Repository<Order>,
    private inventoryService: InventoryService,
    private eventEmitter: EventEmitter2,
    private configService: ConfigService,
  ) {}

  getIdentificationTypes() {
    return this.httpService
      .get(MERCADO_PAGO_API + '/identification_types', { headers: this.getMercadoPagoHeaders() })
      .pipe(
        catchError((error: AxiosError) => {
          throw new HttpException(error.response.data, error.response.status);
        }),
      )
      .pipe(map((resp) => resp.data));
  }

  getInstallments(firstSixDigits: number, amount: number) {
    return this.httpService
      .get(
        MERCADO_PAGO_API +
          `/payment_methods/installments?bin=${firstSixDigits}&amount=${amount}`,
        { headers: this.getMercadoPagoHeaders() },
      )
      .pipe(
        catchError((error: AxiosError) => {
          throw new HttpException(error.response.data, error.response.status);
        }),
      )
      .pipe(map((resp: AxiosResponse<Installment>) => resp.data[0]));
  }

  createCardToken(cardTokenBody: CardTokenBody) {
    return this.httpService
      .post(
        `${MERCADO_PAGO_API}/card_tokens?public_key=${this.getPublicKey()}`,
        cardTokenBody,
        { headers: this.getMercadoPagoHeaders() },
      )
      .pipe(
        catchError((error: AxiosError) => {
          throw new HttpException(error.response.data, error.response.status);
        }),
      )
      .pipe(map((resp: AxiosResponse<CardTokenResponse>) => resp.data));
  }

  async createPayment(paymentBody: PaymentBody): Promise<PaymentResponse> {
    const order = await this.ordersRepository.findOne({
      where: { id: paymentBody.order_id },
      relations: ['orderHasProducts'],
    });

    if (!order) {
      throw new HttpException('Orden no encontrada', HttpStatus.NOT_FOUND);
    }

    if (order.status !== OrderStatus.PENDIENTE_PAGO) {
      throw new HttpException('La orden no está pendiente de pago', HttpStatus.CONFLICT);
    }

    if (order.expires_at && order.expires_at < new Date()) {
      throw new HttpException('El checkout ha expirado', HttpStatus.GONE);
    }

    const orderItems = this.mapOrderItems(order);
    const idempotencyKey = uuidv4();
    const { order_id, ...mpPayload } = paymentBody;

    try {
      const response = await firstValueFrom(
        this.httpService
          .post<PaymentResponse>(
            MERCADO_PAGO_API + '/payments',
            {
              ...mpPayload,
              external_reference: String(order_id),
            },
            {
              headers: this.getMercadoPagoHeaders({
                'X-Idempotency-Key': idempotencyKey,
              }),
            },
          )
          .pipe(
            catchError((error: AxiosError) => {
              throw new HttpException(
                error.response?.data,
                error.response?.status ?? HttpStatus.BAD_GATEWAY,
              );
            }),
          ),
      );

      await this.applyPaymentStatusToOrder(order, response.data);
      return response.data;
    } catch (error) {
      if (order.status === OrderStatus.PENDIENTE_PAGO) {
        await this.inventoryService.releaseReservation(order.id, orderItems);
        order.status = OrderStatus.CANCELADO;
        await this.ordersRepository.save(order);
      }
      throw error;
    }
  }

  async handlePaymentWebhook(
    body: MercadoPagoWebhookDto,
    query: Record<string, string | undefined>,
    headers: Record<string, string | undefined>,
  ): Promise<void> {
    if (body.type && body.type !== 'payment') {
      this.logger.debug(`Webhook ignorado (type=${body.type})`);
      return;
    }

    const paymentId = body.data?.id ?? query['data.id'];
    if (!paymentId) {
      this.logger.warn('Webhook sin payment id');
      return;
    }

    const dataId = String(paymentId);
    this.assertValidWebhookSignature(dataId, headers);

    const payment = await this.fetchPaymentById(dataId);
    const orderId = this.parseOrderIdFromPayment(payment);

    if (!orderId) {
      this.logger.warn(`Pago ${dataId} sin external_reference válida`);
      return;
    }

    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: ['orderHasProducts'],
    });

    if (!order) {
      this.logger.warn(`Orden ${orderId} no encontrada para pago ${dataId}`);
      return;
    }

    await this.applyPaymentStatusToOrder(order, payment);
  }

  private assertValidWebhookSignature(
    dataId: string,
    headers: Record<string, string | undefined>,
  ): void {
    const secret = this.configService.get<string>('MERCADOPAGO_WEBHOOK_SECRET');

    if (!secret) {
      this.logger.warn(
        'MERCADOPAGO_WEBHOOK_SECRET no configurada; webhook aceptado sin validar firma.',
      );
      return;
    }

    const isValid = validateMercadoPagoWebhookSignature(secret, headers, dataId);
    if (!isValid) {
      throw new HttpException('Firma de webhook inválida', HttpStatus.UNAUTHORIZED);
    }
  }

  private async fetchPaymentById(paymentId: string): Promise<PaymentResponse> {
    const response = await firstValueFrom(
      this.httpService
        .get<PaymentResponse>(`${MERCADO_PAGO_API}/payments/${paymentId}`, {
          headers: this.getMercadoPagoHeaders(),
        })
        .pipe(
          catchError((error: AxiosError) => {
            throw new HttpException(
              error.response?.data ?? 'Error al consultar pago en Mercado Pago',
              error.response?.status ?? HttpStatus.BAD_GATEWAY,
            );
          }),
        ),
    );

    return response.data;
  }

  private getAccessToken(): string {
    const token = this.configService.get<string>('MERCADOPAGO_ACCESS_TOKEN');
    if (!token) {
      throw new HttpException(
        'MERCADOPAGO_ACCESS_TOKEN no configurada',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return token;
  }

  private getPublicKey(): string {
    const publicKey = this.configService.get<string>('MERCADOPAGO_PUBLIC_KEY');
    if (!publicKey) {
      throw new HttpException(
        'MERCADOPAGO_PUBLIC_KEY no configurada',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return publicKey;
  }

  private getMercadoPagoHeaders(
    extra: Record<string, string> = {},
  ): Record<string, string> {
    return {
      Authorization: `Bearer ${this.getAccessToken()}`,
      'Content-Type': 'application/json',
      ...extra,
    };
  }

  private parseOrderIdFromPayment(payment: PaymentResponse): number | null {
    const reference = payment.external_reference;
    if (!reference) {
      return null;
    }

    const orderId = Number.parseInt(String(reference), 10);
    return Number.isFinite(orderId) && orderId > 0 ? orderId : null;
  }

  private mapOrderItems(order: Order): OrderItemInput[] {
    return order.orderHasProducts.map((ohp) => ({
      id_product: ohp.id_product,
      quantity: ohp.quantity,
    }));
  }

  private async applyPaymentStatusToOrder(
    order: Order,
    payment: PaymentResponse,
  ): Promise<void> {
    const orderItems = this.mapOrderItems(order);
    const paymentId = String(payment.id);

    if (order.status === OrderStatus.PAGADO) {
      if (order.payment_id === paymentId) {
        this.logger.debug(`Orden ${order.id} ya pagada con pago ${paymentId}`);
      } else {
        this.logger.warn(
          `Orden ${order.id} ya pagada; se ignora pago ${paymentId}`,
        );
      }
      return;
    }

    if (order.status !== OrderStatus.PENDIENTE_PAGO) {
      this.logger.warn(
        `Orden ${order.id} en estado ${order.status}; webhook de pago ${paymentId} ignorado`,
      );
      return;
    }

    if (payment.status === 'approved') {
      await this.inventoryService.confirmSale(order.id, orderItems);
      order.status = OrderStatus.PAGADO;
      order.payment_id = paymentId;
      await this.ordersRepository.save(order);
      this.eventEmitter.emit(
        ORDER_PAID_EVENT,
        new OrderPaidEvent(order.id, paymentId),
      );
      this.logger.log(`Orden ${order.id} marcada PAGADO vía pago ${paymentId}`);
      return;
    }

    if (['rejected', 'cancelled'].includes(payment.status)) {
      await this.inventoryService.releaseReservation(order.id, orderItems);
      order.status = OrderStatus.CANCELADO;
      order.payment_id = paymentId;
      await this.ordersRepository.save(order);
      this.logger.log(`Orden ${order.id} cancelada vía pago ${paymentId}`);
      return;
    }

    if (order.payment_id !== paymentId) {
      order.payment_id = paymentId;
      await this.ordersRepository.save(order);
      this.logger.log(
        `Orden ${order.id} actualizada con pago pendiente ${paymentId}`,
      );
    }
  }
}
