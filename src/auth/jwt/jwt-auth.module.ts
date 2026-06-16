import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../users/user.entity';
import { UserSessionService } from '../user-session.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UserSessionService, JwtStrategy],
  exports: [UserSessionService, JwtStrategy],
})
export class JwtAuthModule {}
