import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Rol } from 'src/roles/rol.entity';
import { AuthModule } from '../auth/auth.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([User, Rol]),
        AuthModule,
        PermissionsModule,
    ],
    providers: [UsersService],
    controllers: [UsersController],
})
export class UsersModule {}
