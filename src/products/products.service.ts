import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './product.entity';
import { Repository, Like } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import asyncForEach = require('../utils/async_foreach');
import { ConfigService } from '@nestjs/config';
import {v2 as cloudinary} from 'cloudinary';
import { configureCloudinary } from '../cloudinary/cloudinary.config';

@Injectable()
export class ProductsService {

    constructor(@InjectRepository(Product) 
    private productsRepository: Repository<Product>,
    private configService: ConfigService,
) {
    configureCloudinary(this.configService);
}

    findAll() {
        return this.productsRepository.find();
    }
    
    findByCategory(id_category: number) {
        return this.productsRepository.findBy({ id_category: id_category });
    }

    findById(id: number) {
        return this.productsRepository.findOneBy({ id: id });
    }

    // async paginate(options: IPaginationOptions): Promise<Pagination<Product>> {
    //     return paginate<Product>(this.productsRepository, options);
    // }

    findByName(name: string) {
        return this.productsRepository.find({ where : { name: Like(`%${name}%`) }})
    }

    async create(files: Array<Express.Multer.File>, product: CreateProductDto) {

        if (files.length === 0) {
            throw new HttpException("Las imagenes son obligatorias", HttpStatus.NOT_FOUND);
        }

        let uploadedFiles = 0; // CONTAR CUANTOS ARCHIVOS SE HAN SUBIDO A FIREBASE

        const newProduct = this.productsRepository.create(product);
        const savedProduct = await this.productsRepository.save(newProduct);        

        const startForEach = async () => {
            await asyncForEach(files, async (file: Express.Multer.File) => {
              
                const result = await cloudinary.uploader.upload(file.path);
                const url = result.secure_url;

                if (url !== undefined && url !== null) {
                    if (uploadedFiles === 0) {
                        savedProduct.image1 = url
                    }
                    else if (uploadedFiles === 1) {
                        savedProduct.image2 = url
                    }
                }

                await this.update(savedProduct.id, savedProduct);
                uploadedFiles = uploadedFiles + 1;
                
            })
        }
        await startForEach();
        return savedProduct;
        
    }
    
    async updateWithImages(files: Array<Express.Multer.File>, id: number, product: UpdateProductDto) {

        if (files.length === 0) {
            throw new HttpException("Las imagenes son obligatorias", HttpStatus.NOT_FOUND);
        }

        let counter = 0;
        let uploadedFiles = Number(product.images_to_update[counter]); // CONTAR CUANTOS ARCHIVOS SE HAN SUBIDO A FIREBASE

        const updatedProduct = await this.update(id, product);     

        const startForEach = async () => {
            await asyncForEach(files, async (file: Express.Multer.File) => {
                
                // const cloudStorage = await initializeStorage();
                // const url = await cloudStorage.uploadFile(file, file.originalname);

                const result = await cloudinary.uploader.upload(file.path);
                const url = result.secure_url;

                if (url !== undefined && url !== null) {
                    if (uploadedFiles === 0) {
                        updatedProduct.image1 = url
                    }
                    else if (uploadedFiles === 1) {
                        updatedProduct.image2 = url
                    }
                }

                await this.update(updatedProduct.id, updatedProduct);
                counter++;
                uploadedFiles = Number(product.images_to_update[counter]);
                
            })
        }
        await startForEach();
        return updatedProduct;
        
    }

    async update(id: number, product: UpdateProductDto)  {   
 
             
        const productFound = await this.productsRepository.findOneBy({ id: id });
        console.log('Product found: ', productFound);
        
        if (!productFound) {
            throw new HttpException("Producto no encontrado", HttpStatus.NOT_FOUND);
        }
        const updatedProduct = Object.assign(productFound, product);
        console.log('Product Updated:', updatedProduct);

        return this.productsRepository.save(updatedProduct);
    }
    
    async delete(id: number)  {
        const productFound = await this.productsRepository.findOneBy({ id: id });
        if (!productFound) {
            throw new HttpException("Producto no encontrado", HttpStatus.NOT_FOUND);
        }
        return this.productsRepository.delete(id);
    }

}
