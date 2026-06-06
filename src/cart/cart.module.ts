import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { InventoryModule } from '../inventory/inventory.module';
import { Product } from '../products/product.entity';
import { JwtStrategy } from '../auth/jwt/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cart, CartItem, Product]),
    InventoryModule,
  ],
  controllers: [CartController],
  providers: [CartService, JwtStrategy],
  exports: [CartService],
})
export class CartModule {}
