import { Controller, UseGuards, Put, Param, Body, ParseIntPipe, Post, Get, Req, ForbiddenException } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { HasRoles } from '../auth/jwt/has-roles';
import { JwtRole } from '../auth/jwt/jwt-role';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { JwtRolesGuard } from '../auth/jwt/jwt-roles.guard';
import { CheckoutOrJwtAuthGuard } from '../auth/jwt/checkout-or-jwt-auth.guard';
import { ApiProtected } from '../common/decorators/api-protected.decorator';
import { CheckoutAuthContext } from '../common/constants/checkout-auth.constants';
import { OrdersService } from './orders.service';
import { CheckoutService } from './checkout.service';
import { CheckoutDto } from './dto/checkout.dto';
import { GuestCheckoutDto } from './dto/guest-checkout.dto';
import { CheckoutOrderResponseDto } from './dto/swagger/order-response.dto';

@ApiTags('orders')
@ApiProtected()
@Controller('orders')
export class OrdersController {

    constructor(
        private ordersService: OrdersService,
        private checkoutService: CheckoutService,
    ) {}

    @HasRoles(JwtRole.ADMIN)
    @UseGuards(JwtAuthGuard, JwtRolesGuard)
    @Get('detail/:id')
    @ApiOperation({ summary: 'Detalle de una orden (admin)' })
    @ApiParam({ name: 'id', example: 45 })
    findById(@Param('id', ParseIntPipe) id: number) {
        return this.ordersService.findById(id);
    }

    @HasRoles(JwtRole.ADMIN)
    @UseGuards(JwtAuthGuard, JwtRolesGuard)
    @Get()
    @ApiOperation({ summary: 'Listar todas las órdenes (admin)' })
    findAll() {
        return this.ordersService.findAll()
    }
    
    @HasRoles(JwtRole.CLIENT, JwtRole.ADMIN)
    @UseGuards(JwtAuthGuard, JwtRolesGuard)
    @Get(':id_client')
    @ApiOperation({ summary: 'Listar órdenes de un cliente' })
    @ApiParam({ name: 'id_client', example: 1 })
    findByClient(@Param('id_client', ParseIntPipe) idClient: number) {
        return this.ordersService.findByClient(idClient);
    }
    
    @HasRoles(JwtRole.CLIENT, JwtRole.ADMIN)
    @UseGuards(JwtAuthGuard, JwtRolesGuard)
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

    @HasRoles(JwtRole.ADMIN)
    @UseGuards(JwtAuthGuard, JwtRolesGuard)
    @Put('update-dispatched/:id')
    @ApiOperation({ summary: 'Marcar orden como despachada' })
    @ApiParam({ name: 'id', example: 45 })
    updateStatus(@Param('id', ParseIntPipe) id: number) {
        return this.ordersService.updateStatus(id);
    }

}
