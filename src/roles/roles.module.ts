import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rol } from './rol.entity';
import { User } from 'src/users/user.entity';
import { JwtAuthModule } from '../auth/jwt/jwt-auth.module';

@Module({
  imports: [ TypeOrmModule.forFeature([ Rol, User]), JwtAuthModule ],
  providers: [RolesService],
  controllers: [RolesController]
})
export class RolesModule {}
