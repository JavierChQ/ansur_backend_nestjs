import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionsModule } from '../permissions/permissions.module';
import { RolesModule } from '../roles/roles.module';
import { User } from '../users/user.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [
    PermissionsModule,
    RolesModule,
    TypeOrmModule.forFeature([User]),
  ],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
