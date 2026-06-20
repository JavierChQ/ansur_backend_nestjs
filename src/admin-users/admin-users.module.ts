import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthModule } from '../auth/jwt/jwt-auth.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { User } from '../users/user.entity';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PermissionsModule,
    JwtAuthModule,
    AuthModule,
  ],
  controllers: [AdminUsersController],
  providers: [AdminUsersService],
})
export class AdminUsersModule {}
