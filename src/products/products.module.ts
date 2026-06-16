import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { Product } from './product.entity';
import { Category } from '../categories/category.entity';
import { JwtAuthModule } from '../auth/jwt/jwt-auth.module';
import { OptionalJwtAuthGuard } from '../auth/jwt/optional-jwt-auth.guard';
import { OrderHasProducts } from 'src/orders/order_has_products.entity';
import { InventoryModule } from '../inventory/inventory.module';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { StockMovement } from '../inventory/entities/stock-movement.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      Category,
      OrderHasProducts,
      CartItem,
      Inventory,
      StockMovement,
    ]),
    InventoryModule,
    JwtAuthModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService, OptionalJwtAuthGuard],
})
export class ProductsModule {}
