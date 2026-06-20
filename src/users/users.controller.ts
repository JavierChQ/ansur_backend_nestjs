import { Body, Controller, Delete, Get, Param, ParseFilePipe, ParseIntPipe, Post, Put, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { PermissionsGuard } from 'src/auth/jwt/permissions.guard';
import { RequirePermissions } from 'src/auth/jwt/require-permissions';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import {v2 as cloudinary} from 'cloudinary';
import { imageFileValidators } from '../common/validators/image-file.validators';
import { LegacyGuestMigrationService } from './legacy-guest-migration.service';
import { MigrateLegacyGuestUsersDto } from './dto/migrate-legacy-guest-users.dto';
import { PermissionCode } from '../permissions/permissions.constants';

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
})

@ApiTags('users')
@Controller('users')
export class UsersController {

    constructor(
        private usersService: UsersService,
        private legacyGuestMigrationService: LegacyGuestMigrationService,
    ) {}
    
    @RequirePermissions(PermissionCode.ADMIN_CUSTOMERS_READ)
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Get()
    @ApiOperation({ summary: 'Listar clientes para panel admin' })
    findAll() {
        return this.usersService.findClientsForAdmin();
    }

    @RequirePermissions(PermissionCode.ADMIN_CUSTOMERS_READ)
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Post('migrate-legacy-guests')
    @ApiOperation({
        summary: 'Migrar usuarios guest del flujo antiguo',
        description:
            'Marca is_guest y password_not_set en cuentas creadas automáticamente durante checkout legacy.',
    })
    @ApiOkResponse({ description: 'Resumen de la migración' })
    migrateLegacyGuests(@Body() dto: MigrateLegacyGuestUsersDto) {
        return this.legacyGuestMigrationService.run({
            dryRun: dto.dryRun ?? true,
            sendActivationEmails: dto.sendActivationEmails ?? false,
            proximitySeconds: dto.proximitySeconds,
        });
    }

    @RequirePermissions(PermissionCode.SHOP_PROFILE)
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Put(':id')
    update(@Param('id', ParseIntPipe) id: number, @Body() user: UpdateUserDto) {
        return this.usersService.update(id, user);
    }

    @RequirePermissions(PermissionCode.SHOP_PROFILE)
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Post('upload/:id')
    @UseInterceptors(FileInterceptor('file', {storage}))
    updateWithImage(
        @UploadedFile(
            new ParseFilePipe({
                validators: imageFileValidators,
              }),
        ) file: Express.Multer.File,
        @Param('id', ParseIntPipe) id: number, 
        @Body() user: UpdateUserDto
    ) {
        return this.usersService.updateWithImage(file, id, user);
    }

    @RequirePermissions(PermissionCode.ADMIN_USERS_DELETE)
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Delete(':id')
    remove(
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.usersService.remove(id);
    }
}
