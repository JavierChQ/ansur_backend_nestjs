import { Controller, UseGuards, Param, Body, ParseIntPipe, Post, Get, Delete, Put, UseInterceptors, UploadedFile, ParseFilePipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { PermissionsGuard } from '../auth/jwt/permissions.guard';
import { RequirePermissions } from '../auth/jwt/require-permissions';
import { CategoriesService } from './categories.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ApiTags } from '@nestjs/swagger';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import {v2 as cloudinary} from 'cloudinary';
import { imageFileValidators } from '../common/validators/image-file.validators';
import { PermissionCode } from '../permissions/permissions.constants';

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
})

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {

    constructor(private CategoriesService: CategoriesService) {}

    @Get()
    findAll() {
        return this.CategoriesService.findAll()
    }

    @Get(':id')
    findById(@Param('id', ParseIntPipe) id: number) {
        return this.CategoriesService.findById(id);
    }

    @RequirePermissions(PermissionCode.ADMIN_CATEGORIES_MANAGE)
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Post()
    @UseInterceptors(FileInterceptor('file', {storage}))
    createWithImage(
        @UploadedFile(
            new ParseFilePipe({
                validators: imageFileValidators,
            }),
        ) file: Express.Multer.File,
        @Body() category: CreateCategoryDto
    ) {
        return this.CategoriesService.create(file,category);
    }
    
    @RequirePermissions(PermissionCode.ADMIN_CATEGORIES_MANAGE)
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Put('upload/:id')
    @UseInterceptors(FileInterceptor('file', {storage}))
    updateWithImage(
        @UploadedFile(
            new ParseFilePipe({
                validators: imageFileValidators,
            }),
        ) file: Express.Multer.File,
        @Param('id', ParseIntPipe) id: number,
        @Body() category: UpdateCategoryDto
    ) {
        return this.CategoriesService.updateWithImage(file, id, category);
    }

    @RequirePermissions(PermissionCode.ADMIN_CATEGORIES_MANAGE)
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Put(':id')
    update( @Param('id', ParseIntPipe) id: number, @Body() category: UpdateCategoryDto) {
        return this.CategoriesService.update(id, category);
    }

    @RequirePermissions(PermissionCode.ADMIN_CATEGORIES_MANAGE)
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Delete(':id')
    delete(@Param('id', ParseIntPipe) id: number) {
        return this.CategoriesService.delete(id);
    }

}
