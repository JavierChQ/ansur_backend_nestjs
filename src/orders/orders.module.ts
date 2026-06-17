import { Module, forwardRef } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { CheckoutService } from './checkout.service';
import { GuestUserProvisioningService } from './guest-user-provisioning.service';
import { OrderInvoiceService } from './order-invoice.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './order.entity';
import { OrderHasProducts } from './order_has_products.entity';
import { User } from 'src/users/user.entity';
import { Address } from '../address/address.entity';
import { Product } from '../products/product.entity';
import { CartModule } from '../cart/cart.module';
import { InventoryModule } from '../inventory/inventory.module';
import { Rol } from 'src/roles/rol.entity';
import { AuthModule } from '../auth/auth.module';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderHasProducts, User, Address, Product, Rol]),
    CartModule,
    InventoryModule,
    IdentityModule,
    forwardRef(() => AuthModule),
  ],
  providers: [
    OrdersService,
    CheckoutService,
    GuestUserProvisioningService,
    OrderInvoiceService,
  ],
  controllers: [OrdersController],
  exports: [OrdersService, CheckoutService, GuestUserProvisioningService],
})
export class OrdersModule {}
