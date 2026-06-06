import { Controller, UseGuards, Param, Body, ParseIntPipe, Post, Get } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiGoneResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { HasRoles } from '../auth/jwt/has-roles';
import { JwtRole } from '../auth/jwt/jwt-role';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { JwtRolesGuard } from '../auth/jwt/jwt-roles.guard';
import { ApiProtected } from '../common/decorators/api-protected.decorator';
import { MercadoPagoService } from './mercado_pago.service';
import { CardTokenBody } from '../mercado_pago/models/card_token_body';
import { PaymentBodyDto } from './dto/payment-body.dto';

@ApiTags('mercadopago')
@ApiProtected()
@Controller('mercadopago')
export class MercadoPagoController {

    constructor(private mercadoPagoService: MercadoPagoService) {}

    @HasRoles(JwtRole.ADMIN, JwtRole.CLIENT)
    @UseGuards(JwtAuthGuard, JwtRolesGuard)
    @Get('identification_types')
    @ApiOperation({ summary: 'Tipos de identificación aceptados por Mercado Pago' })
    getIdentificationTypes() {
        return this.mercadoPagoService.getIdentificationTypes();
    }
    
    @HasRoles(JwtRole.ADMIN, JwtRole.CLIENT)
    @UseGuards(JwtAuthGuard, JwtRolesGuard)
    @Get('installments/:first_six_digits/:amount')
    @ApiOperation({ summary: 'Cuotas disponibles según BIN y monto' })
    @ApiParam({ name: 'first_six_digits', example: 450799 })
    @ApiParam({ name: 'amount', example: 99.8 })
    getInstallments(
        @Param('first_six_digits') firstSixDigits: number, 
        @Param('amount') amount: number
    ) {
        return this.mercadoPagoService.getInstallments(firstSixDigits, amount);
    }
    
    @HasRoles(JwtRole.ADMIN, JwtRole.CLIENT)
    @UseGuards(JwtAuthGuard, JwtRolesGuard)
    @Post('card_token')
    @ApiOperation({ summary: 'Generar token de tarjeta para el pago' })
    createCardToken(@Body() cardTokenBody: CardTokenBody) {
        return this.mercadoPagoService.createCardToken(cardTokenBody);
    }
    
    @HasRoles(JwtRole.ADMIN, JwtRole.CLIENT)
    @UseGuards(JwtAuthGuard, JwtRolesGuard)
    @Post('payments')
    @ApiOperation({
        summary: 'Procesar pago de una orden existente',
        description:
            'Requiere order_id de POST /orders/checkout. ' +
            'Si el pago es aprobado, confirma la venta y descuenta stock. ' +
            'Si es rechazado, libera la reserva.',
    })
    @ApiOkResponse({ description: 'Respuesta de Mercado Pago con status del pago' })
    @ApiNotFoundResponse({ description: 'Orden no encontrada' })
    @ApiConflictResponse({ description: 'La orden no está pendiente de pago' })
    @ApiGoneResponse({ description: 'El checkout expiró (15 min)' })
    createPayment(@Body() paymentBody: PaymentBodyDto) {
        return this.mercadoPagoService.createPayment(paymentBody);
    }
}
