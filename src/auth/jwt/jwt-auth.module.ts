import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../users/user.entity';
import { UserSessionService } from '../user-session.service';
import { PermissionsGuard } from './permissions.guard';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UserSessionService, JwtStrategy, PermissionsGuard],
  exports: [UserSessionService, JwtStrategy, PermissionsGuard],
})
export class JwtAuthModule {}
