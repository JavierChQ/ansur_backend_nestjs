import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppRole } from '../auth/jwt/app-role';
import { Rol } from '../roles/rol.entity';
import { User } from '../users/user.entity';
import { PermissionCode } from './permissions.constants';

@Injectable()
export class RoleAssignmentService {
  constructor(@InjectRepository(Rol) private readonly rolesRepository: Repository<Rol>) {}

  getSingleRoleId(user: Pick<User, 'roles'>): string {
    const roles = user.roles ?? [];

    if (roles.length === 0) {
      return AppRole.CLIENT;
    }

    if (roles.length > 1) {
      throw new BadRequestException('Un usuario solo puede tener un rol asignado');
    }

    return roles[0].id;
  }

  async assignRole(user: User, roleId: AppRole): Promise<User> {
    const role = await this.rolesRepository.findOneBy({ id: roleId });

    if (!role) {
      throw new NotFoundException(`Rol ${roleId} no encontrado`);
    }

    user.roles = [role];
    return user;
  }

  assertCanAssignRole(
    targetRoleId: AppRole,
    actorPermissions: string[],
  ): void {
    const privilegedRoles = [AppRole.ADMIN, AppRole.SUPER_ADMIN];

    if (privilegedRoles.includes(targetRoleId)) {
      if (!actorPermissions.includes(PermissionCode.ADMIN_USERS_CREATE_ADMIN)) {
        throw new ForbiddenException(
          'No tienes permiso para crear o asignar usuarios administradores',
        );
      }
    }
  }
}
