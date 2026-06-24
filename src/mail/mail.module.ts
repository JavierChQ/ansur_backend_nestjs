import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../orders/order.entity';
import { MailService } from './mail.service';
import { SalesReceiptService } from './sales-receipt.service';
import { AccountActivationService } from './account-activation.service';
import { PasswordResetMailService } from './password-reset-mail.service';
import { OrderPaidActivationService } from './order-paid-activation.service';
import { OrderPaidListener } from './listeners/order-paid.listener';
import { OrdersModule } from '../orders/orders.module';
import { AuthModule } from '../auth/auth.module';
import { OrderReceiptBuilder } from './order-receipt/order-receipt.builder';
import { OrderReceiptHtmlRenderer } from './order-receipt/order-receipt-html.renderer';
import { OrderReceiptPdfGenerator } from './order-receipt/order-receipt-pdf.generator';
import { CompanyConfigModule } from '../company-config/company-config.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order]),
    forwardRef(() => OrdersModule),
    forwardRef(() => AuthModule),
    CompanyConfigModule,
  ],
  providers: [
    MailService,
    SalesReceiptService,
    AccountActivationService,
    PasswordResetMailService,
    OrderPaidActivationService,
    OrderPaidListener,
    OrderReceiptBuilder,
    OrderReceiptHtmlRenderer,
    OrderReceiptPdfGenerator,
  ],
  exports: [MailService, SalesReceiptService, AccountActivationService, PasswordResetMailService],
})
export class MailModule {}
