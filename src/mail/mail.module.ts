import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../orders/order.entity';
import { MailService } from './mail.service';
import { SalesReceiptService } from './sales-receipt.service';
import { AccountActivationService } from './account-activation.service';
import { OrderPaidActivationService } from './order-paid-activation.service';
import { OrderPaidListener } from './listeners/order-paid.listener';
import { OrdersModule } from '../orders/orders.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order]),
    forwardRef(() => OrdersModule),
    forwardRef(() => AuthModule),
  ],
  providers: [
    MailService,
    SalesReceiptService,
    AccountActivationService,
    OrderPaidActivationService,
    OrderPaidListener,
  ],
  exports: [MailService, SalesReceiptService, AccountActivationService],
})
export class MailModule {}
