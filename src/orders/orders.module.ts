import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { CheckoutService } from './checkout.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './order.entity';
import { OrderHasProducts } from './order_has_products.entity';
import { User } from 'src/users/user.entity';
import { Address } from '../address/address.entity';
import { Product } from '../products/product.entity';
import { CartModule } from '../cart/cart.module';
import { InventoryModule } from '../inventory/inventory.module';
import { Rol } from 'src/roles/rol.entity';
import { JwtStrategy } from '../auth/jwt/jwt.strategy';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderHasProducts, User, Address, Product, Rol]),
    CartModule,
    InventoryModule,
    AuthModule,
  ],
  providers: [OrdersService, CheckoutService, JwtStrategy],
  controllers: [OrdersController],
  exports: [OrdersService, CheckoutService],
})
export class OrdersModule {}
