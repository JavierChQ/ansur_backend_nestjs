import { Module, Inject, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { RolesModule } from './roles/roles.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { AddressModule } from './address/address.module';
import { MercadoPagoModule } from './mercado_pago/mercado_pago.module';
import { OrdersModule } from './orders/orders.module';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { InventoryModule } from './inventory/inventory.module';
import { CartModule } from './cart/cart.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    
    TypeOrmModule.forRoot ({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      autoLoadEntities: true,
      synchronize: true,

      // ssl: process.env.DB_SSL === "true",
      // extra: {
      //   ssl:
      //     process.env.DB_SSL === "true"
      //       ? {
      //           rejectUnauthorized: false,
      //         }
      //       : null,
      // },
    }),

    UsersModule,
    AuthModule,
    RolesModule,
    CategoriesModule,
    ProductsModule,
    AddressModule,
    MercadoPagoModule,
    OrdersModule,
    InventoryModule,
    CartModule,
    MailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
