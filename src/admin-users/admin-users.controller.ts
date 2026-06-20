import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { PermissionsGuard } from '../auth/jwt/permissions.guard';
import { RequirePermissions } from '../auth/jwt/require-permissions';
import { ApiProtected } from '../common/decorators/api-protected.decorator';
import { PermissionCode } from '../permissions/permissions.constants';
import { AdminUsersService } from './admin-users.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';

@ApiTags('admin-users')
@ApiProtected()
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @RequirePermissions(PermissionCode.ADMIN_USERS_CREATE_ADMIN)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post()
  @ApiOperation({ summary: 'Crear usuario administrador (solo SUPER_ADMIN)' })
  @ApiOkResponse({ description: 'Admin creado; se envía correo de activación' })
  @ApiForbiddenResponse({ description: 'Sin permiso para crear administradores' })
  @ApiConflictResponse({ description: 'Email o teléfono ya registrado' })
  createAdmin(
    @Req() req: { user: { permissions: string[] } },
    @Body() dto: CreateAdminUserDto,
  ) {
    return this.adminUsersService.createAdminUser(dto, req.user.permissions);
  }

  @RequirePermissions(PermissionCode.ADMIN_CUSTOMERS_READ)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('clients')
  @ApiOperation({ summary: 'Listar clientes' })
  listClients() {
    return this.adminUsersService.listClients();
  }

  @RequirePermissions(PermissionCode.ADMIN_USERS_CREATE_ADMIN)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('admins')
  @ApiOperation({ summary: 'Listar administradores (solo SUPER_ADMIN)' })
  listAdmins() {
    return this.adminUsersService.listAdmins();
  }
}
