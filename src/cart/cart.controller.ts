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
import { ApiTags } from '@nestjs/swagger';
import { HasRoles } from '../auth/jwt/has-roles';
import { JwtRole } from '../auth/jwt/jwt-role';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { JwtRolesGuard } from '../auth/jwt/jwt-roles.guard';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';

@ApiTags('cart')
@Controller('cart')
export class CartController {
  constructor(private cartService: CartService) {}

  @HasRoles(JwtRole.CLIENT, JwtRole.ADMIN)
  @UseGuards(JwtAuthGuard, JwtRolesGuard)
  @Get()
  getCart(@Req() req: { user: { userId: number } }) {
    return this.cartService.getCart(req.user.userId);
  }

  @HasRoles(JwtRole.CLIENT, JwtRole.ADMIN)
  @UseGuards(JwtAuthGuard, JwtRolesGuard)
  @Post('items')
  addItem(
    @Req() req: { user: { userId: number } },
    @Body() dto: AddCartItemDto,
  ) {
    return this.cartService.addOrUpdateItem(req.user.userId, dto);
  }

  @HasRoles(JwtRole.CLIENT, JwtRole.ADMIN)
  @UseGuards(JwtAuthGuard, JwtRolesGuard)
  @Delete('items/:productId')
  removeItem(
    @Req() req: { user: { userId: number } },
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.cartService.removeItem(req.user.userId, productId);
  }
}
