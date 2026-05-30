import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from './category.entity';
import { Repository } from 'typeorm';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ConfigService } from '@nestjs/config';
import {v2 as cloudinary} from 'cloudinary';
import { configureCloudinary } from '../cloudinary/cloudinary.config';


@Injectable()
export class CategoriesService {

    constructor(
        @InjectRepository(Category) 
        private categoriesRepository: Repository<Category>,
        private configService: ConfigService,
    ) {
        configureCloudinary(this.configService);
    }

    findAll() {
        return this.categoriesRepository.find()    
    }

    async create(file: Express.Multer.File, category: CreateCategoryDto) {

        const result = await cloudinary.uploader.upload(file.path);
        if (!result) {
          throw new HttpException('La imagen no se pudo guardar', HttpStatus.INTERNAL_SERVER_ERROR);
        }
        category.image = result.secure_url;
        const newCategory = this.categoriesRepository.create(category);
        return this.categoriesRepository.save(newCategory);
    }
    
    async update(id: number, category: UpdateCategoryDto) {        
        const categoryFound = await this.categoriesRepository.findOneBy({ id: id });
        
        if (!categoryFound) {
            throw new HttpException('La categoria no existe', HttpStatus.NOT_FOUND);
        }

        const updatedCategory = Object.assign(categoryFound, category);
        return this.categoriesRepository.save(updatedCategory);
    }
   
    async updateWithImage(file: Express.Multer.File, id: number, category: UpdateCategoryDto) {
        const result = await cloudinary.uploader.upload(file.path);
        if (!result) {
          throw new HttpException('La imagen no se pudo guardar', HttpStatus.INTERNAL_SERVER_ERROR);
        }
        
        const categoryFound = await this.categoriesRepository.findOneBy({ id: id });
        
        if (!categoryFound) {
            throw new HttpException('La categoria no existe', HttpStatus.NOT_FOUND);
        }

        category.image = result.secure_url;
        const updatedCategory = Object.assign(categoryFound, category);
        return this.categoriesRepository.save(updatedCategory);
    }

    async delete(id: number) {
        const categoryFound = await this.categoriesRepository.findOneBy({ id: id });
        
        if (!categoryFound) {
            throw new HttpException('La categoria no existe', HttpStatus.NOT_FOUND);
        }
        
        return this.categoriesRepository.delete(id);
    }

}
