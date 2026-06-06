import { Controller, UseGuards, Put, Param, Body, ParseIntPipe, Post, Get, Req } from '@nestjs/common';
import {
  ApiConflictResponse,
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
import { OrdersService } from './orders.service';
import { CheckoutService } from './checkout.service';
import { CheckoutDto } from './dto/checkout.dto';
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

    @HasRoles(JwtRole.ADMIN)
    @UseGuards(JwtAuthGuard, JwtRolesGuard)
    @Put('update-dispatched/:id')
    @ApiOperation({ summary: 'Marcar orden como despachada' })
    @ApiParam({ name: 'id', example: 45 })
    updateStatus(@Param('id', ParseIntPipe) id: number) {
        return this.ordersService.updateStatus(id);
    }

}
