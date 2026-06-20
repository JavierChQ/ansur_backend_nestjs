import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rol } from '../roles/rol.entity';
import { User } from '../users/user.entity';
import { Permission } from './permission.entity';
import { PermissionsService } from './permissions.service';
import { RoleAssignmentService } from './role-assignment.service';

@Module({
  imports: [TypeOrmModule.forFeature([Permission, Rol, User])],
  providers: [PermissionsService, RoleAssignmentService],
  exports: [PermissionsService, RoleAssignmentService],
})
export class PermissionsModule {}
