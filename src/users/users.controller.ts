import { Body, Controller, Delete, Get, Param, ParseFilePipe, ParseIntPipe, Post, Put, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { PermissionsGuard } from 'src/auth/jwt/permissions.guard';
import { RequirePermissions } from 'src/auth/jwt/require-permissions';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import {v2 as cloudinary} from 'cloudinary';
import { imageFileValidators } from '../common/validators/image-file.validators';
import { PermissionCode } from '../permissions/permissions.constants';

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
})

@ApiTags('users')
@Controller('users')
export class UsersController {

    constructor(private usersService: UsersService) {}
    
    @RequirePermissions(PermissionCode.ADMIN_CUSTOMERS_READ)
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Get()
    @ApiOperation({ summary: 'Listar clientes para panel admin' })
    findAll() {
        return this.usersService.findClientsForAdmin();
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
