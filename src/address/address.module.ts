import { Module } from '@nestjs/common';
import { AddressService } from './address.service';
import { AddressController } from './address.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Address } from './address.entity';
import { User } from '../users/user.entity';
import { JwtAuthModule } from '../auth/jwt/jwt-auth.module';
import { Order } from 'src/orders/order.entity';


@Module({
  imports: [ TypeOrmModule.forFeature([Address, User, Order]), JwtAuthModule ],
  providers: [AddressService],
  controllers: [AddressController]
})
export class AddressModule {}
