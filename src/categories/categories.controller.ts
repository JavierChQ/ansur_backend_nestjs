import { Controller, UseGuards, Put, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, Param, Body, ParseIntPipe, Post, Get, Delete } from '@nestjs/common';
import { HasRoles } from '../auth/jwt/has-roles';
import { JwtRole } from '../auth/jwt/jwt-role';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { JwtRolesGuard } from '../auth/jwt/jwt-roles.guard';
import { CategoriesService } from './categories.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ApiTags } from '@nestjs/swagger';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import {v2 as cloudinary} from 'cloudinary';

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
})

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {

    constructor(private CategoriesService: CategoriesService) {}

    // @HasRoles(JwtRole.CLIENT, JwtRole.ADMIN)
    // @UseGuards(JwtAuthGuard, JwtRolesGuard)
    @Get()
    findAll() {
        return this.CategoriesService.findAll()
    }

    @HasRoles(JwtRole.ADMIN)
    @UseGuards(JwtAuthGuard, JwtRolesGuard)
    @Post() // http:localhost:3000/categories -> POST
    @UseInterceptors(FileInterceptor('file', {storage}))
    createWithImage(
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                  new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 10 }),
                  new FileTypeValidator({ fileType: '.(png|jpeg|jpg)' }),
                ],
              }),
        ) file: Express.Multer.File,
        @Body() category: CreateCategoryDto
    ) {
        return this.CategoriesService.create(file,category);
    }
    
    @HasRoles(JwtRole.ADMIN)
    @UseGuards(JwtAuthGuard, JwtRolesGuard)
    @Put(':id')
    update( @Param('id', ParseIntPipe) id: number, @Body() category: UpdateCategoryDto) {
        return this.CategoriesService.update(id, category);
    }

    @HasRoles(JwtRole.ADMIN)
    @UseGuards(JwtAuthGuard, JwtRolesGuard)
    @Put('upload/:id') // http:localhost:3000/categories -> PUT
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
        @Body() category: UpdateCategoryDto
    ) {
        return this.CategoriesService.updateWithImage(file, id, category);
    }

    @HasRoles(JwtRole.ADMIN)
    @UseGuards(JwtAuthGuard, JwtRolesGuard)
    @Delete(':id')
    delete(@Param('id', ParseIntPipe) id: number) {
        return this.CategoriesService.delete(id);
    }

}
