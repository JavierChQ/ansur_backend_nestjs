import { Body, Controller, Delete, Get, Param, ParseFilePipe, ParseIntPipe, Post, Put, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtRolesGuard } from 'src/auth/jwt/jwt-roles.guard';
import { JwtRole } from 'src/auth/jwt/jwt-role';
import { HasRoles } from 'src/auth/jwt/has-roles';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import {v2 as cloudinary} from 'cloudinary';
import { imageFileValidators } from '../common/validators/image-file.validators';
import { LegacyGuestMigrationService } from './legacy-guest-migration.service';
import { MigrateLegacyGuestUsersDto } from './dto/migrate-legacy-guest-users.dto';

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
    
    @HasRoles(JwtRole.ADMIN)
    @UseGuards(JwtAuthGuard, JwtRolesGuard)
    @Get()
    @ApiOperation({ summary: 'Listar clientes para panel admin' })
    findAll() {
        return this.usersService.findClientsForAdmin();
    }

    @HasRoles(JwtRole.ADMIN)
    @UseGuards(JwtAuthGuard, JwtRolesGuard)
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

    
    @Post() // http://localhost/users -> POST 
    create(@Body() user: CreateUserDto) {
        return this.usersService.create(user);
    }

    @HasRoles(JwtRole.CLIENT)
    @UseGuards(JwtAuthGuard, JwtRolesGuard)
    @Put(':id') // http://192.168.1.15:3000/users/:id -> PUT 
    update(@Param('id', ParseIntPipe) id: number, @Body() user: UpdateUserDto) {
        return this.usersService.update(id, user);
    }

    @HasRoles(JwtRole.ADMIN, JwtRole.CLIENT)
    @UseGuards(JwtAuthGuard, JwtRolesGuard)
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

    @HasRoles(JwtRole.ADMIN)
    @UseGuards(JwtAuthGuard, JwtRolesGuard)
    @Delete(':id') // http:localhost:3000/categories -> PUT
    remove(
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.usersService.remove(id);
    }
}
