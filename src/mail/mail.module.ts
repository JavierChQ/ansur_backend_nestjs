import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../orders/order.entity';
import { MailService } from './mail.service';
import { SalesReceiptService } from './sales-receipt.service';
import { OrderPaidListener } from './listeners/order-paid.listener';

@Module({
  imports: [TypeOrmModule.forFeature([Order])],
  providers: [MailService, SalesReceiptService, OrderPaidListener],
  exports: [MailService, SalesReceiptService],
})
export class MailModule {}
