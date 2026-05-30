import { Body, Controller, Delete, FileTypeValidator, Get, MaxFileSizeValidator, Param, ParseFilePipe, ParseIntPipe, Post, Put, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtRolesGuard } from 'src/auth/jwt/jwt-roles.guard';
import { JwtRole } from 'src/auth/jwt/jwt-role';
import { HasRoles } from 'src/auth/jwt/has-roles';
import { ApiTags } from '@nestjs/swagger';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import {v2 as cloudinary} from 'cloudinary';

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
})

@ApiTags('users')
@Controller('users')
export class UsersController {

    constructor(private usersService: UsersService) {}
    
    @HasRoles(JwtRole.ADMIN, JwtRole.CLIENT)
    @UseGuards(JwtAuthGuard, JwtRolesGuard)
    @Get() // http://localhost/users -> GET
    findAll() {
        return this.usersService.findAll();
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
                validators: [
                  new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 10 }),
                  new FileTypeValidator({ fileType: '.(png|jpeg|jpg)' }),
                ],
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
