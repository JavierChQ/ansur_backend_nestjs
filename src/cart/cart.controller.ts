import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { PermissionsGuard } from '../auth/jwt/permissions.guard';
import { RequirePermissions } from '../auth/jwt/require-permissions';
import { ApiProtected } from '../common/decorators/api-protected.decorator';
import { PermissionCode } from '../permissions/permissions.constants';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { CartResponseDto } from './dto/swagger/cart-response.dto';

@ApiTags('cart')
@ApiProtected()
@Controller('cart')
export class CartController {
  constructor(private cartService: CartService) {}

  @RequirePermissions(PermissionCode.SHOP_CART)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get()
  @ApiOperation({
    summary: 'Obtener carrito activo del usuario',
    description: 'Un carrito ACTIVE por usuario. TTL: 7 días desde la última modificación.',
  })
  @ApiOkResponse({ type: CartResponseDto })
  getCart(@Req() req: { user: { userId: number } }) {
    return this.cartService.getCart(req.user.userId);
  }

  @RequirePermissions(PermissionCode.SHOP_CART)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post('items')
  @ApiOperation({
    summary: 'Añadir o actualizar ítem en el carrito',
    description: 'Valida disponibilidad pero no reserva stock. Devuelve 409 si no hay stock suficiente.',
  })
  @ApiOkResponse({ type: CartResponseDto })
  @ApiConflictResponse({ description: 'Stock insuficiente' })
  @ApiNotFoundResponse({ description: 'Producto no encontrado' })
  addItem(
    @Req() req: { user: { userId: number } },
    @Body() dto: AddCartItemDto,
  ) {
    return this.cartService.addOrUpdateItem(req.user.userId, dto);
  }

  @RequirePermissions(PermissionCode.SHOP_CART)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Delete('items/:productId')
  @ApiOperation({ summary: 'Eliminar un producto del carrito' })
  @ApiParam({ name: 'productId', example: 12 })
  @ApiOkResponse({ type: CartResponseDto })
  @ApiNotFoundResponse({ description: 'Carrito activo no encontrado' })
  removeItem(
    @Req() req: { user: { userId: number } },
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.cartService.removeItem(req.user.userId, productId);
  }
}
