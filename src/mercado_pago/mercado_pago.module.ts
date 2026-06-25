import { Module } from '@nestjs/common';
import { MercadoPagoService } from './mercado_pago.service';
import { MercadoPagoController } from './mercado_pago.controller';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../orders/order.entity';
import { InventoryModule } from '../inventory/inventory.module';
import { AuthModule } from '../auth/auth.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([Order]), InventoryModule, AuthModule, OrdersModule],
  providers: [MercadoPagoService],
  controllers: [MercadoPagoController],
})
export class MercadoPagoModule {}
