import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AppRole } from '../auth/jwt/app-role';
import { Rol } from '../roles/rol.entity';
import { User } from '../users/user.entity';
import {
  ADMIN_PERMISSIONS,
  ALL_PERMISSION_CODES,
  CLIENT_PERMISSIONS,
  PermissionCodeValue,
} from './permissions.constants';
import { Permission } from './permission.entity';

const PERMISSION_DEFINITIONS: Array<{ id: PermissionCodeValue; description: string }> = [
  { id: 'shop:cart', description: 'Gestionar carrito de compras' },
  { id: 'shop:checkout', description: 'Iniciar checkout y pagos' },
  { id: 'shop:orders:own', description: 'Consultar pedidos propios' },
  { id: 'shop:address', description: 'Gestionar direcciones de envío' },
  { id: 'shop:profile', description: 'Actualizar perfil de cliente' },
  { id: 'admin:panel:access', description: 'Acceder al panel administrativo' },
  { id: 'admin:products:read', description: 'Ver precios de compra y alertas' },
  { id: 'admin:products:manage', description: 'Crear y editar productos' },
  { id: 'admin:categories:manage', description: 'Gestionar categorías' },
  { id: 'admin:orders:read', description: 'Listar y ver detalle de órdenes' },
  { id: 'admin:orders:manage', description: 'Actualizar estado de órdenes' },
  { id: 'admin:inventory:manage', description: 'Gestionar inventario y stock' },
  { id: 'admin:customers:read', description: 'Listar clientes' },
  { id: 'admin:users:create:client', description: 'Crear usuarios cliente' },
  { id: 'admin:users:create:admin', description: 'Crear usuarios administradores' },
  { id: 'admin:users:delete', description: 'Eliminar usuarios' },
  { id: 'admin:roles:manage', description: 'Gestionar roles y permisos' },
];

const ROLE_PERMISSIONS: Record<AppRole, PermissionCodeValue[]> = {
  [AppRole.CLIENT]: CLIENT_PERMISSIONS,
  [AppRole.ADMIN]: ADMIN_PERMISSIONS,
  [AppRole.SUPER_ADMIN]: ALL_PERMISSION_CODES,
};

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(
    @InjectRepository(Permission)
    private readonly permissionsRepository: Repository<Permission>,
    @InjectRepository(Rol)
    private readonly rolesRepository: Repository<Rol>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async seedPermissionsAndRoleMappings(): Promise<void> {
    for (const definition of PERMISSION_DEFINITIONS) {
      const existing = await this.permissionsRepository.findOneBy({
        id: definition.id,
      });

      if (!existing) {
        await this.permissionsRepository.save(
          this.permissionsRepository.create(definition),
        );
      }
    }

    for (const [roleId, permissionCodes] of Object.entries(ROLE_PERMISSIONS)) {
      const role = await this.rolesRepository.findOne({
        where: { id: roleId },
        relations: ['permissions'],
      });

      if (!role) {
        this.logger.warn(`Rol ${roleId} no encontrado; omitiendo permisos`);
        continue;
      }

      const permissions = await this.permissionsRepository.findBy({
        id: In(permissionCodes),
      });
      role.permissions = permissions;
      await this.rolesRepository.save(role);
    }

    await this.normalizeUsersToSingleRole();
    await this.ensureConfiguredSuperAdmin();
  }

  private async ensureConfiguredSuperAdmin(): Promise<void> {
    const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();

    if (!email) {
      return;
    }

    const user = await this.usersRepository.findOne({
      where: { email },
      relations: ['roles'],
    });

    if (!user) {
      this.logger.warn(
        `SUPER_ADMIN_EMAIL=${email} configurado, pero el usuario no existe`,
      );
      return;
    }

    const superAdminRole = await this.rolesRepository.findOneBy({
      id: AppRole.SUPER_ADMIN,
    });

    if (!superAdminRole) {
      return;
    }

    if (user.roles?.length === 1 && user.roles[0].id === AppRole.SUPER_ADMIN) {
      return;
    }

    user.roles = [superAdminRole];
    await this.usersRepository.save(user);
    this.logger.log(`Usuario ${email} promovido a SUPER_ADMIN`);
  }

  async getPermissionsForRole(roleId: string): Promise<string[]> {
    const role = await this.rolesRepository.findOne({
      where: { id: roleId },
      relations: ['permissions'],
    });

    if (!role?.permissions?.length) {
      return ROLE_PERMISSIONS[roleId as AppRole] ?? [];
    }

    return role.permissions.map((permission) => permission.id);
  }

  async normalizeUsersToSingleRole(): Promise<void> {
    const users = await this.usersRepository.find({ relations: ['roles'] });

    for (const user of users) {
      if (!user.roles?.length) {
        const clientRole = await this.rolesRepository.findOneBy({
          id: AppRole.CLIENT,
        });
        if (clientRole) {
          user.roles = [clientRole];
          await this.usersRepository.save(user);
        }
        continue;
      }

      if (user.roles.length > 1) {
        const priority = [AppRole.SUPER_ADMIN, AppRole.ADMIN, AppRole.CLIENT];
        const selected =
          priority.find((roleId) => user.roles.some((role) => role.id === roleId)) ??
          user.roles[0].id;
        const role = await this.rolesRepository.findOneBy({ id: selected });
        if (role) {
          user.roles = [role];
          await this.usersRepository.save(user);
          this.logger.warn(
            `Usuario ${user.id} tenía varios roles; se conservó ${selected}`,
          );
        }
      }
    }
  }
}
