import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRolDto } from './dto/create-rol.dto';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { PermissionsGuard } from 'src/auth/jwt/permissions.guard';
import { RequirePermissions } from 'src/auth/jwt/require-permissions';
import { ApiTags } from '@nestjs/swagger';
import { PermissionCode } from '../permissions/permissions.constants';

@ApiTags('roles')
@Controller('roles')
export class RolesController {

    constructor(private rolesService: RolesService) {}

    @RequirePermissions(PermissionCode.ADMIN_ROLES_MANAGE)
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Post()
    create(@Body() rol: CreateRolDto) {
        return this.rolesService.create(rol);
    }
}
