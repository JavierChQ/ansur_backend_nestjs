import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { LegacyGuestMigrationService } from './legacy-guest-migration.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Rol } from 'src/roles/rol.entity';
import { Order } from 'src/orders/order.entity';
import { AuthModule } from '../auth/auth.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([User, Rol, Order]),
        AuthModule,
        PermissionsModule,
    ],
    providers: [UsersService, LegacyGuestMigrationService],
    controllers: [UsersController],
})
export class UsersModule {}
