import { HttpService } from '@nestjs/axios/dist';
import { Injectable, HttpException, HttpStatus, Logger, OnModuleInit, ForbiddenException } from '@nestjs/common';
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
import { validateMercadoPagoWebhookSignature, extractWebhookPaymentId } from './utils/webhook-signature.util';
import { PaymentAuthContext } from '../common/constants/checkout-auth.constants';

interface OrderItemInput {
  id_product: number;
  quantity: number;
}

@Injectable()
export class MercadoPagoService implements OnModuleInit {
  private readonly logger = new Logger(MercadoPagoService.name);

  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(Order) private ordersRepository: Repository<Order>,
    private inventoryService: InventoryService,
    private eventEmitter: EventEmitter2,
    private configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.assertMatchingCredentialEnvironments();
    this.assertProductionWebhookConfig();

    try {
      await firstValueFrom(
        this.httpService
          .get(MERCADO_PAGO_API + '/payment_methods', {
            headers: this.getMercadoPagoHeaders(),
          })
          .pipe(
            catchError((error: AxiosError) => {
              throw error;
            }),
          ),
      );
      this.logger.log('Credenciales de Mercado Pago verificadas correctamente');
    } catch {
      this.logger.error(
        'MERCADOPAGO_ACCESS_TOKEN inválida o expirada. ' +
          'Copiá Public Key y Access Token juntos desde el panel de MP ' +
          '(Tus integraciones → Credenciales de prueba) y reiniciá el backend.',
      );
    }
  }

  getPublicConfig() {
    const publicKey = this.getPublicKey();
    return {
      public_key: publicKey,
      site_id: 'MPE',
      locale: 'es-PE',
      sandbox: publicKey.startsWith('TEST-'),
    };
  }

  async getOrderPaymentStatus(orderId: number, auth: PaymentAuthContext) {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new HttpException('Orden no encontrada', HttpStatus.NOT_FOUND);
    }

    this.assertOrderPaymentAccess(order, auth, orderId);

    return {
      order_id: order.id,
      status: order.status,
      payment_id: order.payment_id ?? null,
      expires_at: order.expires_at ?? null,
    };
  }

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

  async createPayment(
    paymentBody: PaymentBody,
    auth?: PaymentAuthContext,
  ): Promise<PaymentResponse> {
    const order = await this.ordersRepository.findOne({
      where: { id: paymentBody.order_id },
      relations: ['orderHasProducts'],
    });

    if (!order) {
      throw new HttpException('Orden no encontrada', HttpStatus.NOT_FOUND);
    }

    this.assertOrderPaymentAccess(order, auth, paymentBody.order_id);

    if (order.status !== OrderStatus.PENDIENTE_PAGO) {
      throw new HttpException('La orden no está pendiente de pago', HttpStatus.CONFLICT);
    }

    if (order.expires_at && order.expires_at < new Date()) {
      throw new HttpException('El checkout ha expirado', HttpStatus.GONE);
    }

    this.assertValidPaymentPayload(paymentBody, order);

    const idempotencyKey = uuidv4();
    const response = await firstValueFrom(
      this.httpService
        .post<PaymentResponse>(
          MERCADO_PAGO_API + '/payments',
          this.buildMercadoPagoPaymentPayload(paymentBody),
          {
            headers: this.getMercadoPagoHeaders({
              'X-Idempotency-Key': idempotencyKey,
            }),
          },
        )
        .pipe(
          catchError((error: AxiosError) => {
            throw new HttpException(
              this.formatMercadoPagoApiError(error.response?.data),
              error.response?.status ?? HttpStatus.BAD_GATEWAY,
            );
          }),
        ),
    );

    await this.applyPaymentStatusToOrder(order, response.data);
    return response.data;
  }

  async handlePaymentWebhook(
    body: MercadoPagoWebhookDto,
    query: Record<string, string | undefined>,
    headers: Record<string, string | undefined>,
  ): Promise<void> {
    const paymentId = extractWebhookPaymentId(body, query);
    if (!paymentId) {
      this.logger.debug('Webhook ignorado (sin payment id o topic distinto)');
      return;
    }

    this.assertValidWebhookSignature(paymentId, headers);

    const payment = await this.fetchPaymentById(paymentId);
    const orderId = this.parseOrderIdFromPayment(payment);

    if (!orderId) {
      this.logger.warn(`Pago ${paymentId} sin external_reference válida`);
      return;
    }

    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: ['orderHasProducts'],
    });

    if (!order) {
      this.logger.warn(`Orden ${orderId} no encontrada para pago ${paymentId}`);
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

  private buildMercadoPagoPaymentPayload(paymentBody: PaymentBody) {
    const payer: PaymentBody['payer'] = { email: paymentBody.payer.email };

    if (paymentBody.payer.identification) {
      payer.identification = paymentBody.payer.identification;
    }

    const payload: Record<string, unknown> = {
      transaction_amount: paymentBody.transaction_amount,
      token: paymentBody.token,
      installments: paymentBody.installments,
      payment_method_id: paymentBody.payment_method_id,
      payer,
      external_reference: String(paymentBody.order_id),
    };

    if (paymentBody.issuer_id) {
      payload.issuer_id = paymentBody.issuer_id;
    }

    return payload;
  }

  private assertValidPaymentPayload(
    paymentBody: PaymentBody,
    order: Order,
  ): void {
    const orderAmount = Number(order.amount);
    const paymentAmount = Number(paymentBody.transaction_amount);

    if (Math.abs(orderAmount - paymentAmount) > 0.01) {
      throw new HttpException(
        'El monto del pago no coincide con la orden',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (paymentBody.payment_method_id !== 'yape' && !paymentBody.issuer_id) {
      throw new HttpException(
        'issuer_id es requerido para pagos con tarjeta',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (
      paymentBody.payment_method_id !== 'yape' &&
      !paymentBody.payer.identification?.type
    ) {
      throw new HttpException(
        'La identificación del pagador es requerida para pagos con tarjeta',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private formatMercadoPagoApiError(data: unknown): string {
    if (!data || typeof data !== 'object') {
      return 'Error al procesar el pago en Mercado Pago';
    }

    const body = data as Record<string, unknown>;
    const causes = body.cause;

    if (Array.isArray(causes) && causes.length > 0) {
      const first = causes[0] as Record<string, unknown>;
      if (typeof first.description === 'string' && first.description.trim()) {
        return first.description;
      }
      if (typeof first.code === 'string' && first.code.trim()) {
        return first.code;
      }
    }

    if (typeof body.message === 'string' && body.message.trim()) {
      return body.message;
    }

    return 'Error al procesar el pago en Mercado Pago';
  }

  private getAccessToken(): string {
    const token = this.configService.get<string>('MERCADOPAGO_ACCESS_TOKEN')?.trim();
    if (!token) {
      throw new HttpException(
        'MERCADOPAGO_ACCESS_TOKEN no configurada',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return token;
  }

  private getPublicKey(): string {
    const publicKey = this.configService.get<string>('MERCADOPAGO_PUBLIC_KEY')?.trim();
    if (!publicKey) {
      throw new HttpException(
        'MERCADOPAGO_PUBLIC_KEY no configurada',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return publicKey;
  }

  private assertProductionWebhookConfig(): void {
    const nodeEnv = this.configService.get<string>('NODE_ENV') ?? 'development';
    if (nodeEnv !== 'production') {
      return;
    }

    const secret = this.configService.get<string>('MERCADOPAGO_WEBHOOK_SECRET')?.trim();
    if (!secret) {
      this.logger.error(
        'NODE_ENV=production pero MERCADOPAGO_WEBHOOK_SECRET está vacío. ' +
          'Configuralo en el panel de Mercado Pago → Webhooks y en las variables del servidor.',
      );
    }

    const accessToken = this.getAccessToken();
    if (accessToken.startsWith('TEST-')) {
      this.logger.error(
        'NODE_ENV=production pero MERCADOPAGO_ACCESS_TOKEN usa credenciales TEST-. ' +
          'Usá credenciales APP_USR- de producción.',
      );
    }
  }

  private assertMatchingCredentialEnvironments(): void {
    const accessToken = this.getAccessToken();
    const publicKey = this.getPublicKey();
    const accessIsTest = accessToken.startsWith('TEST-');
    const publicIsTest = publicKey.startsWith('TEST-');

    if (accessIsTest !== publicIsTest) {
      this.logger.error(
        'Las credenciales de Mercado Pago no coinciden: ' +
          'MERCADOPAGO_ACCESS_TOKEN y MERCADOPAGO_PUBLIC_KEY deben ser ambas TEST- (prueba) ' +
          'o ambas APP_USR- (producción), de la misma aplicación.',
      );
    }
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

  private assertOrderPaymentAccess(
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
}
