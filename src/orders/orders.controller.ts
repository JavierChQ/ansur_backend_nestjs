import { Controller, UseGuards, Put, Patch, Param, Body, ParseIntPipe, Post, Get, Req, ForbiddenException, ConflictException } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiGoneResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { PermissionsGuard } from '../auth/jwt/permissions.guard';
import { RequirePermissions } from '../auth/jwt/require-permissions';
import { CheckoutOrJwtAuthGuard } from '../auth/jwt/checkout-or-jwt-auth.guard';
import { ApiProtected } from '../common/decorators/api-protected.decorator';
import { CheckoutAuthContext, PaymentAuthContext } from '../common/constants/checkout-auth.constants';
import { PermissionCode } from '../permissions/permissions.constants';
import { OrdersService } from './orders.service';
import { CheckoutService } from './checkout.service';
import { OrderPaymentService } from './order-payment.service';
import { WhatsappPaymentService } from './whatsapp-payment.service';
import { PaymentChannel } from './enums/payment-channel.enum';
import { CheckoutDto } from './dto/checkout.dto';
import { GuestCheckoutDto } from './dto/guest-checkout.dto';
import { UpdateCheckoutDeliveryDto } from './dto/update-checkout-delivery.dto';
import { ManualPaymentNotesDto } from './dto/manual-payment-notes.dto';
import { WhatsappPaymentIntentResponseDto } from './dto/whatsapp-payment-intent-response.dto';
import { ResetMercadoPagoCheckoutResponseDto } from './dto/reset-mercadopago-checkout-response.dto';
import { CheckoutOrderResponseDto } from './dto/swagger/order-response.dto';

@ApiTags('orders')
@ApiProtected()
@Controller('orders')
export class OrdersController {

    constructor(
        private ordersService: OrdersService,
        private checkoutService: CheckoutService,
        private orderPaymentService: OrderPaymentService,
        private whatsappPaymentService: WhatsappPaymentService,
    ) {}

    @RequirePermissions(PermissionCode.ADMIN_ORDERS_READ)
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Get('detail/:id')
    @ApiOperation({ summary: 'Detalle de una orden (admin)' })
    @ApiParam({ name: 'id', example: 45 })
    findById(@Param('id', ParseIntPipe) id: number) {
        return this.ordersService.findById(id);
    }

    @RequirePermissions(PermissionCode.ADMIN_ORDERS_READ)
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Get()
    @ApiOperation({ summary: 'Listar todas las órdenes (admin)' })
    findAll() {
        return this.ordersService.findAll()
    }
    
    @RequirePermissions(PermissionCode.SHOP_ORDERS_OWN)
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Get(':id_client')
    @ApiOperation({ summary: 'Listar órdenes de un cliente' })
    @ApiParam({ name: 'id_client', example: 1 })
    findByClient(
        @Req() req: { user: { userId: number } },
        @Param('id_client', ParseIntPipe) idClient: number,
    ) {
        if (req.user.userId !== idClient) {
            throw new ForbiddenException('No puedes consultar pedidos de otro usuario');
        }

        return this.ordersService.findByClient(idClient);
    }
    
    @RequirePermissions(PermissionCode.SHOP_CHECKOUT)
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Post('checkout')
    @ApiOperation({
        summary: 'Iniciar checkout desde el carrito',
        description:
            'Crea una orden PENDIENTE_PAGO, reserva stock por 15 minutos y marca el carrito como CHECKED_OUT. ' +
            'Luego usar POST /mercadopago/payments con el order_id retornado.',
    })
    @ApiOkResponse({ type: CheckoutOrderResponseDto })
    @ApiConflictResponse({ description: 'Stock insuficiente en algún producto' })
    checkout(
        @Req() req: { user: { userId: number } },
        @Body() dto: CheckoutDto,
    ) {
        return this.checkoutService.checkout(req.user.userId, dto);
    }

    @Post('guest-checkout')
    @ApiOperation({
        summary: 'Checkout sin autenticación',
        description:
            'Valida stock y crea orden PENDIENTE_PAGO sin usuario. Devuelve checkout_token para pagar. ' +
            'Si el email ya está registrado, responde 409 EMAIL_ALREADY_REGISTERED.',
    })
    @ApiOkResponse({ description: 'Orden y checkout_token' })
    @ApiConflictResponse({ description: 'Stock insuficiente, email o teléfono duplicado' })
    guestCheckout(@Body() dto: GuestCheckoutDto) {
        return this.checkoutService.guestCheckout(dto);
    }

    @UseGuards(CheckoutOrJwtAuthGuard)
    @Patch(':orderId/checkout-delivery')
    @ApiOperation({
        summary: 'Actualizar tipo de entrega de una orden pendiente',
        description:
            'Recalcula el monto y actualiza el snapshot de entrega sin crear una nueva orden. ' +
            'Requiere JWT de cliente o checkout_token de invitado.',
    })
    @ApiParam({ name: 'orderId', example: 45 })
    @ApiOkResponse({ type: CheckoutOrderResponseDto })
    @ApiUnauthorizedResponse({ description: 'Token inválido o expirado' })
    @ApiForbiddenResponse({ description: 'Token no corresponde a la orden' })
    @ApiConflictResponse({ description: 'La orden ya no está pendiente de pago' })
    updateCheckoutDelivery(
        @Req() req: { user?: { userId: number }; checkoutAuth?: CheckoutAuthContext },
        @Param('orderId', ParseIntPipe) orderId: number,
        @Body() dto: UpdateCheckoutDeliveryDto,
    ) {
        return this.checkoutService.updatePendingCheckoutDelivery(orderId, dto, {
            userId: req.user?.userId,
            checkoutAuth: req.checkoutAuth,
        });
    }

    @UseGuards(CheckoutOrJwtAuthGuard)
    @Post(':orderId/claim-session')
    @ApiOperation({
        summary: 'Obtener sesión de usuario tras pago invitado',
        description:
            'Requiere checkout_token. La orden debe estar PAGADA. Crea el usuario si aún no existe y devuelve JWT.',
    })
    @ApiParam({ name: 'orderId', example: 45 })
    @ApiOkResponse({ description: 'JWT de usuario y datos básicos' })
    @ApiUnauthorizedResponse({ description: 'checkout_token inválido o expirado' })
    @ApiForbiddenResponse({ description: 'Token no corresponde a la orden' })
    @ApiConflictResponse({ description: 'La orden aún no está pagada' })
    claimGuestSession(
        @Req() req: { checkoutAuth?: CheckoutAuthContext },
        @Param('orderId', ParseIntPipe) orderId: number,
    ) {
        if (!req.checkoutAuth) {
            throw new ForbiddenException('Se requiere checkout_token');
        }

        return this.checkoutService.claimGuestSession(orderId, req.checkoutAuth);
    }

    @ApiProtected()
    @RequirePermissions(PermissionCode.SHOP_CHECKOUT)
    @UseGuards(CheckoutOrJwtAuthGuard, PermissionsGuard)
    @Post(':orderId/whatsapp-payment-intent')
    @ApiOperation({
        summary: 'Registrar intención de pago por WhatsApp',
        description:
            'Marca la orden con canal WhatsApp, extiende la reserva de stock a 2 horas y devuelve el mensaje para wa.me.',
    })
    @ApiParam({ name: 'orderId', example: 45 })
    @ApiOkResponse({ type: WhatsappPaymentIntentResponseDto })
    @ApiNotFoundResponse({ description: 'Orden no encontrada' })
    @ApiConflictResponse({ description: 'La orden no está pendiente de pago' })
    @ApiGoneResponse({ description: 'El checkout expiró' })
    registerWhatsappPaymentIntent(
        @Req() req: { user?: { userId: number }; checkoutAuth?: CheckoutAuthContext },
        @Param('orderId', ParseIntPipe) orderId: number,
    ) {
        return this.whatsappPaymentService.registerIntent(
            orderId,
            this.buildPaymentAuth(req),
        );
    }

    @ApiProtected()
    @RequirePermissions(PermissionCode.SHOP_CHECKOUT)
    @UseGuards(CheckoutOrJwtAuthGuard, PermissionsGuard)
    @Post(':orderId/reset-mercadopago-checkout')
    @ApiOperation({
        summary: 'Restablecer checkout para Mercado Pago',
        description:
            'Limpia el canal WhatsApp y restablece la reserva de stock a 15 minutos.',
    })
    @ApiParam({ name: 'orderId', example: 45 })
    @ApiOkResponse({ type: ResetMercadoPagoCheckoutResponseDto })
    resetMercadoPagoCheckout(
        @Req() req: { user?: { userId: number }; checkoutAuth?: CheckoutAuthContext },
        @Param('orderId', ParseIntPipe) orderId: number,
    ) {
        return this.whatsappPaymentService.resetMercadoPagoCheckout(
            orderId,
            this.buildPaymentAuth(req),
        );
    }

    @RequirePermissions(PermissionCode.ADMIN_ORDERS_MANAGE)
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Post(':orderId/confirm-manual-payment')
    @ApiOperation({ summary: 'Confirmar pago manual de una orden WhatsApp' })
    @ApiParam({ name: 'orderId', example: 45 })
    @ApiOkResponse({ type: CheckoutOrderResponseDto })
    async confirmManualPayment(
        @Req() req: { user: { userId: number } },
        @Param('orderId', ParseIntPipe) orderId: number,
        @Body() dto: ManualPaymentNotesDto,
    ) {
        const order = await this.orderPaymentService.findPendingOrder(orderId);

        if (order.payment_channel !== PaymentChannel.WHATSAPP) {
            throw new ConflictException('La orden no tiene pago pendiente por WhatsApp');
        }

        const saved = await this.orderPaymentService.confirmOrderPaid(order, {
            paymentId: `whatsapp-manual-${order.id}`,
            paymentChannel: PaymentChannel.WHATSAPP,
            confirmedBy: req.user.userId,
            notes: dto.notes,
        });

        return this.ordersService.findById(saved.id);
    }

    @RequirePermissions(PermissionCode.ADMIN_ORDERS_MANAGE)
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Post(':orderId/cancel-manual-payment')
    @ApiOperation({ summary: 'Cancelar una orden pendiente de pago por WhatsApp' })
    @ApiParam({ name: 'orderId', example: 45 })
    @ApiOkResponse({ type: CheckoutOrderResponseDto })
    async cancelManualPayment(
        @Req() req: { user: { userId: number } },
        @Param('orderId', ParseIntPipe) orderId: number,
        @Body() dto: ManualPaymentNotesDto,
    ) {
        const order = await this.orderPaymentService.findPendingOrder(orderId);

        if (order.payment_channel !== PaymentChannel.WHATSAPP) {
            throw new ConflictException('La orden no tiene pago pendiente por WhatsApp');
        }

        const saved = await this.orderPaymentService.cancelPendingOrder(order, {
            cancelledBy: req.user.userId,
            notes: dto.notes,
        });

        return this.ordersService.findById(saved.id);
    }

    @RequirePermissions(PermissionCode.ADMIN_ORDERS_MANAGE)
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Put('update-dispatched/:id')
    @ApiOperation({ summary: 'Marcar orden como despachada' })
    @ApiParam({ name: 'id', example: 45 })
    updateStatus(@Param('id', ParseIntPipe) id: number) {
        return this.ordersService.updateStatus(id);
    }

    private buildPaymentAuth(req: {
        user?: { userId: number };
        checkoutAuth?: CheckoutAuthContext;
    }): PaymentAuthContext {
        if (req.checkoutAuth) {
            return { checkout: req.checkoutAuth };
        }

        return { userId: req.user?.userId };
    }

}
