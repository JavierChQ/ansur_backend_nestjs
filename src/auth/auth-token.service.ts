import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/user.entity';
import { PermissionsService } from '../permissions/permissions.service';
import { RoleAssignmentService } from '../permissions/role-assignment.service';

export interface AuthTokenPayload {
  id: number;
  name: string;
  role: string;
  roles: string[];
  permissions: string[];
  token_version: number;
}

export interface AuthSessionResponse {
  user: Record<string, unknown> & {
    role: string;
    permissions: string[];
  };
  token: string;
}

@Injectable()
export class AuthTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly permissionsService: PermissionsService,
    private readonly roleAssignmentService: RoleAssignmentService,
  ) {}

  async buildSessionResponse(user: User): Promise<AuthSessionResponse> {
    const roleId = this.roleAssignmentService.getSingleRoleId(user);
    const permissions = await this.permissionsService.getPermissionsForRole(roleId);
    const payload = this.buildPayload(user, roleId, permissions);
    const token = this.jwtService.sign(payload);
    const { password, ...safeUser } = user;

    return {
      user: {
        ...safeUser,
        role: roleId,
        permissions,
      },
      token: `Bearer ${token}`,
    };
  }

  buildPayload(
    user: Pick<User, 'id' | 'name' | 'token_version'>,
    roleId: string,
    permissions: string[],
  ): AuthTokenPayload {
    return {
      id: user.id,
      name: user.name,
      role: roleId,
      roles: [roleId],
      permissions,
      token_version: user.token_version ?? 0,
    };
  }

  async signPayloadForUser(user: User): Promise<string> {
    const roleId = this.roleAssignmentService.getSingleRoleId(user);
    const permissions = await this.permissionsService.getPermissionsForRole(roleId);
    const payload = this.buildPayload(user, roleId, permissions);
    return this.jwtService.sign(payload);
  }
}
