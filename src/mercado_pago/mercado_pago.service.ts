import { HttpService } from '@nestjs/axios/dist';
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { AxiosResponse, AxiosError } from 'axios';
import { catchError, firstValueFrom, map } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { MERCADO_PAGO_API } from 'src/config/config';
import { IdentificationType } from './models/identification_type';
import { MERCADO_PAGO_HEADERS } from '../config/config';
import { Installment, PayerCost } from './models/installment';
import { CardTokenBody } from './models/card_token_body';
import { CardTokenResponse } from './models/card_token_response';
import { PaymentResponse } from './models/payment_response';
import { PaymentBody } from './models/payment_body';
import { Repository } from 'typeorm';
import { Order } from 'src/orders/order.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { OrderStatus } from '../orders/enums/order-status.enum';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class MercadoPagoService {

    constructor(
        private readonly httpService: HttpService,
        @InjectRepository(Order) private ordersRepository: Repository<Order>,
        private inventoryService: InventoryService,
    ) {}

    getIdentificationTypes() {
        return this.httpService.get(MERCADO_PAGO_API + '/identification_types', { headers: MERCADO_PAGO_HEADERS }).pipe(
            catchError((error: AxiosError) => {
                throw new HttpException(error.response.data, error.response.status);
            })
        ).pipe(map((resp) => resp.data));
    }

    getInstallments(firstSixDigits: number, amount: number) {
        return this.httpService.get(MERCADO_PAGO_API + `/payment_methods/installments?bin=${firstSixDigits}&amount=${amount}`, { headers: MERCADO_PAGO_HEADERS }).pipe(
            catchError((error: AxiosError) => {
                throw new HttpException(error.response.data, error.response.status);
            })
        ).pipe(map((resp: AxiosResponse<Installment>) => resp.data[0]));
    }

    createCardToken(cardTokenBody: CardTokenBody) {
        return this.httpService.post(
            MERCADO_PAGO_API + `/card_tokens?public_key=TEST-8568eec6-7fc0-48dc-b15a-d6a9278057e1`,
            cardTokenBody, 
            { headers: MERCADO_PAGO_HEADERS }
        ).pipe(
            catchError((error: AxiosError) => {
                throw new HttpException(error.response.data, error.response.status);
            })
        ).pipe(map((resp: AxiosResponse<CardTokenResponse>) => resp.data));
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

        const orderItems = order.orderHasProducts.map((ohp) => ({
            id_product: ohp.id_product,
            quantity: ohp.quantity,
        }));

        const idempotencyKey = uuidv4();
        const { order_id, ...mpPayload } = paymentBody;

        try {
            const response = await firstValueFrom(
                this.httpService.post<PaymentResponse>(
                    MERCADO_PAGO_API + '/payments',
                    {
                        ...mpPayload,
                        external_reference: String(order_id),
                    },
                    { headers: { ...MERCADO_PAGO_HEADERS, 'X-Idempotency-Key': idempotencyKey } },
                ).pipe(
                    catchError((error: AxiosError) => {
                        throw new HttpException(error.response?.data, error.response?.status ?? HttpStatus.BAD_GATEWAY);
                    }),
                ),
            );

            const payment = response.data;

            if (payment.status === 'approved') {
                await this.inventoryService.confirmSale(order.id, orderItems);
                order.status = OrderStatus.PAGADO;
                order.payment_id = String(payment.id);
            } else if (['rejected', 'cancelled'].includes(payment.status)) {
                await this.inventoryService.releaseReservation(order.id, orderItems);
                order.status = OrderStatus.CANCELADO;
                order.payment_id = payment.id ? String(payment.id) : null;
            } else {
                order.payment_id = payment.id ? String(payment.id) : null;
            }

            await this.ordersRepository.save(order);
            return payment;
        } catch (error) {
            if (order.status === OrderStatus.PENDIENTE_PAGO) {
                await this.inventoryService.releaseReservation(order.id, orderItems);
                order.status = OrderStatus.CANCELADO;
                await this.ordersRepository.save(order);
            }
            throw error;
        }
    }
}
