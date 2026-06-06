import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inventory } from './entities/inventory.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { InventorySchedulerService } from './inventory-scheduler.service';
import { JwtStrategy } from '../auth/jwt/jwt.strategy';
import { Order } from '../orders/order.entity';
import { Cart } from '../cart/entities/cart.entity';
import { Product } from '../products/product.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inventory, StockMovement, Order, Cart, Product]),
  ],
  controllers: [InventoryController],
  providers: [InventoryService, InventorySchedulerService, JwtStrategy],
  exports: [InventoryService],
})
export class InventoryModule {}
