import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { AppRole } from '../auth/jwt/app-role';
import { PasswordSetupService } from '../auth/password-setup.service';
import { PermissionCode } from '../permissions/permissions.constants';
import { RoleAssignmentService } from '../permissions/role-assignment.service';
import { User } from '../users/user.entity';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly roleAssignmentService: RoleAssignmentService,
    private readonly passwordSetupService: PasswordSetupService,
  ) {}

  async createAdminUser(
    dto: CreateAdminUserDto,
    actorPermissions: string[],
  ) {
    this.roleAssignmentService.assertCanAssignRole(
      AppRole.ADMIN,
      actorPermissions,
    );

    if (!actorPermissions.includes(PermissionCode.ADMIN_USERS_CREATE_ADMIN)) {
      throw new HttpException(
        'No tienes permiso para crear administradores',
        HttpStatus.FORBIDDEN,
      );
    }

    await this.assertUniqueContact(dto.email, dto.phone);

    const user = this.usersRepository.create({
      name: dto.name,
      lastname: dto.lastname,
      email: dto.email,
      phone: dto.phone,
      password: randomBytes(16).toString('hex'),
      password_not_set: true,
      is_guest: false,
    });

    await this.roleAssignmentService.assignRole(user, AppRole.ADMIN);
    const savedUser = await this.usersRepository.save(user);
    await this.passwordSetupService.createAndSendActivationEmail(savedUser.id);

    const { password, ...safeUser } = savedUser;

    return {
      message:
        'Administrador creado. Se envió un correo para activar la cuenta.',
      user: safeUser,
    };
  }

  async listClients() {
    const users = await this.usersRepository.find({
      relations: ['roles'],
      order: { created_at: 'DESC' },
    });

    return users
      .filter(
        (user) => this.roleAssignmentService.getSingleRoleId(user) === AppRole.CLIENT,
      )
      .map(({ password, ...safeUser }) => safeUser);
  }

  async listAdmins() {
    const users = await this.usersRepository.find({
      relations: ['roles'],
      order: { created_at: 'DESC' },
    });

    return users
      .filter((user) => {
        const roleId = this.roleAssignmentService.getSingleRoleId(user);
        return roleId === AppRole.ADMIN || roleId === AppRole.SUPER_ADMIN;
      })
      .map(({ password, ...safeUser }) => safeUser);
  }

  private async assertUniqueContact(email: string, phone: string): Promise<void> {
    const emailExists = await this.usersRepository.findOneBy({ email });
    if (emailExists) {
      throw new HttpException('El email ya está registrado', HttpStatus.CONFLICT);
    }

    const phoneExists = await this.usersRepository.findOneBy({ phone });
    if (phoneExists) {
      throw new HttpException('El teléfono ya está registrado', HttpStatus.CONFLICT);
    }
  }
}
