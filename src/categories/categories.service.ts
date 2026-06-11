import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from './category.entity';
import { Repository } from 'typeorm';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ConfigService } from '@nestjs/config';
import { configureCloudinary } from '../cloudinary/cloudinary.config';
import { getCloudinaryUrlFromFile } from '../cloudinary/cloudinary-upload.util';
import { Product } from '../products/product.entity';

@Injectable()
export class CategoriesService {

    constructor(
        @InjectRepository(Category) 
        private categoriesRepository: Repository<Category>,
        @InjectRepository(Product)
        private productsRepository: Repository<Product>,
        private configService: ConfigService,
    ) {
        configureCloudinary(this.configService);
    }

    findAll() {
        return this.categoriesRepository.find()    
    }

    async findById(id: number) {
        const category = await this.categoriesRepository.findOneBy({ id });

        if (!category) {
            throw new HttpException('La categoria no existe', HttpStatus.NOT_FOUND);
        }

        return category;
    }

    async create(file: Express.Multer.File, category: CreateCategoryDto) {
        category.image = getCloudinaryUrlFromFile(file);
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
        const categoryFound = await this.categoriesRepository.findOneBy({ id: id });
        
        if (!categoryFound) {
            throw new HttpException('La categoria no existe', HttpStatus.NOT_FOUND);
        }

        category.image = getCloudinaryUrlFromFile(file);
        const updatedCategory = Object.assign(categoryFound, category);
        return this.categoriesRepository.save(updatedCategory);
    }

    async delete(id: number) {
        const categoryFound = await this.categoriesRepository.findOneBy({ id: id });
        
        if (!categoryFound) {
            throw new HttpException('La categoria no existe', HttpStatus.NOT_FOUND);
        }

        const productsCount = await this.productsRepository.countBy({ id_category: id });

        if (productsCount > 0) {
            throw new HttpException(
                `No se puede eliminar la categoría porque tiene ${productsCount} producto(s) asociado(s)`,
                HttpStatus.CONFLICT,
            );
        }
        
        return this.categoriesRepository.delete(id);
    }

}
