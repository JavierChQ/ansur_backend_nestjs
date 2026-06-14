import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { LegacyGuestMigrationService } from './legacy-guest-migration.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { JwtStrategy } from 'src/auth/jwt/jwt.strategy';
import { Rol } from 'src/roles/rol.entity';
import { Order } from 'src/orders/order.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([User, Rol, Order]),
        AuthModule,
    ],
    providers: [UsersService, LegacyGuestMigrationService, JwtStrategy],
    controllers: [UsersController],
})
export class UsersModule {}
