import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppRole } from '../auth/jwt/app-role';
import { PermissionsService } from '../permissions/permissions.service';
import { RoleAssignmentService } from '../permissions/role-assignment.service';
import { RolesService } from '../roles/roles.service';
import { User } from '../users/user.entity';

interface SuperAdminConfig {
  email: string;
  password: string;
  name: string;
  lastname: string;
  phone: string;
}

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly rolesService: RolesService,
    private readonly permissionsService: PermissionsService,
    private readonly roleAssignmentService: RoleAssignmentService,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async run(): Promise<void> {
    this.assertCanRunInEnvironment();
    this.assertHashSaltConfigured();

    const superAdminConfig = this.readSuperAdminConfig();

    this.logger.log('Iniciando seed...');

    await this.rolesService.seedDefaultRoles();
    this.logger.log('Roles OK');

    await this.permissionsService.seedPermissionsAndRoleMappings();
    this.logger.log('Permisos OK');

    await this.seedSuperAdmin(superAdminConfig);

    this.logger.log('Seed completado');
  }

  private assertCanRunInEnvironment(): void {
    if (
      process.env.NODE_ENV === 'production' &&
      process.env.SEED_ALLOW_PRODUCTION !== 'true'
    ) {
      throw new Error(
        'Seed bloqueado en producción. Configure SEED_ALLOW_PRODUCTION=true para continuar.',
      );
    }
  }

  private assertHashSaltConfigured(): void {
    const salt = Number(process.env.HASH_SALT);

    if (!process.env.HASH_SALT || Number.isNaN(salt) || salt < 1) {
      throw new Error(
        'HASH_SALT debe estar configurado con un número entero válido (ej. 10).',
      );
    }
  }

  private readSuperAdminConfig(): SuperAdminConfig {
    const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.SUPER_ADMIN_PASSWORD;
    const name = process.env.SUPER_ADMIN_NAME?.trim();
    const lastname = process.env.SUPER_ADMIN_LASTNAME?.trim();
    const phone = process.env.SUPER_ADMIN_PHONE?.trim();

    const missing: string[] = [];
    if (!email) missing.push('SUPER_ADMIN_EMAIL');
    if (!password) missing.push('SUPER_ADMIN_PASSWORD');
    if (!name) missing.push('SUPER_ADMIN_NAME');
    if (!lastname) missing.push('SUPER_ADMIN_LASTNAME');
    if (!phone) missing.push('SUPER_ADMIN_PHONE');

    if (missing.length > 0) {
      throw new Error(`Variables requeridas faltantes: ${missing.join(', ')}`);
    }

    if (password.length < 6) {
      throw new Error('SUPER_ADMIN_PASSWORD debe tener al menos 6 caracteres');
    }

    return { email, password, name, lastname, phone };
  }

  private async seedSuperAdmin(config: SuperAdminConfig): Promise<void> {
    const existingByEmail = await this.usersRepository.findOneBy({
      email: config.email,
    });

    if (existingByEmail) {
      this.logger.log(
        `Super admin omitido: ${config.email} ya existe (sin cambios)`,
      );
      return;
    }

    const existingByPhone = await this.usersRepository.findOneBy({
      phone: config.phone,
    });

    if (existingByPhone) {
      throw new Error(
        `SUPER_ADMIN_PHONE=${config.phone} ya está registrado con otro email`,
      );
    }

    const user = this.usersRepository.create({
      name: config.name,
      lastname: config.lastname,
      email: config.email,
      phone: config.phone,
      password: config.password,
      password_not_set: false,
      is_guest: false,
    });

    await this.roleAssignmentService.assignRole(user, AppRole.SUPER_ADMIN);
    await this.usersRepository.save(user);

    this.logger.log(`Super admin creado: ${config.email}`);
  }
}
