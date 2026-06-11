import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './product.entity';
import { Repository, Like } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { ConfigService } from '@nestjs/config';
import { configureCloudinary } from '../cloudinary/cloudinary.config';
import { getCloudinaryUrlFromFile } from '../cloudinary/cloudinary-upload.util';
import { InventoryService } from '../inventory/inventory.service';
import { OrderHasProducts } from '../orders/order_has_products.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { StockMovement } from '../inventory/entities/stock-movement.entity';

@Injectable()
export class ProductsService {

    constructor(
        @InjectRepository(Product)
        private productsRepository: Repository<Product>,
        @InjectRepository(OrderHasProducts)
        private orderHasProductsRepository: Repository<OrderHasProducts>,
        @InjectRepository(CartItem)
        private cartItemsRepository: Repository<CartItem>,
        @InjectRepository(Inventory)
        private inventoryRepository: Repository<Inventory>,
        @InjectRepository(StockMovement)
        private stockMovementRepository: Repository<StockMovement>,
        private configService: ConfigService,
        private inventoryService: InventoryService,
    ) {
        configureCloudinary(this.configService);
    }

    async findAll() {
        const products = await this.productsRepository.find();
        return this.attachStockStatus(products);
    }
    
    async findByCategory(id_category: number) {
        const products = await this.productsRepository.findBy({ id_category });
        return this.attachStockStatus(products);
    }

    async findById(id: number) {
        const product = await this.productsRepository.findOneBy({ id });
        if (!product) return null;
        const [mapped] = await this.attachStockStatus([product]);
        return mapped;
    }

    async findByName(name: string) {
        const products = await this.productsRepository.find({ where: { name: Like(`%${name}%`) } });
        return this.attachStockStatus(products);
    }

    private async attachStockStatus(products: Product[]) {
        const ids = products.map((p) => p.id);
        const availability = await this.inventoryService.getAvailabilityMap(ids);
        return products.map((product) => ({
            ...product,
            in_stock: availability.get(product.id) ?? false,
        }));
    }

    async create(files: Array<Express.Multer.File>, product: CreateProductDto) {

        if (files.length === 0) {
            throw new HttpException('Las imagenes son obligatorias', HttpStatus.BAD_REQUEST);
        }

        const { initial_stock = 0, min_stock = 0, ...productData } = product;
        const newProduct = this.productsRepository.create({
            ...productData,
            image1: getCloudinaryUrlFromFile(files[0]),
            image2: files[1] ? getCloudinaryUrlFromFile(files[1]) : undefined,
        });
        const savedProduct = await this.productsRepository.save(newProduct);

        await this.inventoryService.createForProduct(
            savedProduct.id,
            initial_stock,
            min_stock,
            undefined,
            'Stock inicial',
        );

        return savedProduct;
    }
    
    async updateWithImages(files: Array<Express.Multer.File>, id: number, product: UpdateProductDto) {

        if (files.length === 0) {
            throw new HttpException('Las imagenes son obligatorias', HttpStatus.BAD_REQUEST);
        }

        const imageSlots = this.normalizeImagesToUpdate(product.images_to_update);
        const { images_to_update: _ignored, ...productData } = product;
        const updatedProduct = await this.update(id, productData);

        files.forEach((file, index) => {
            const slot = imageSlots[index] ?? index;
            const url = getCloudinaryUrlFromFile(file);

            if (slot === 0) {
                updatedProduct.image1 = url;
            } else if (slot === 1) {
                updatedProduct.image2 = url;
            }
        });

        return this.productsRepository.save(updatedProduct);
    }

    async update(id: number, product: UpdateProductDto)  {   
        const { images_to_update: _ignored, ...productData } = product;
        const productFound = await this.productsRepository.findOneBy({ id: id });
        
        if (!productFound) {
            throw new HttpException('Producto no encontrado', HttpStatus.NOT_FOUND);
        }

        const updatedProduct = Object.assign(productFound, productData);
        return this.productsRepository.save(updatedProduct);
    }
    
    async delete(id: number)  {
        const productFound = await this.productsRepository.findOneBy({ id: id });
        if (!productFound) {
            throw new HttpException('Producto no encontrado', HttpStatus.NOT_FOUND);
        }

        const ordersCount = await this.orderHasProductsRepository.countBy({ id_product: id });
        if (ordersCount > 0) {
            throw new HttpException(
                'No se puede eliminar el producto porque está asociado a pedidos',
                HttpStatus.CONFLICT,
            );
        }

        await this.cartItemsRepository.delete({ id_product: id });
        await this.stockMovementRepository.delete({ id_product: id });
        await this.inventoryRepository.delete({ id_product: id });

        return this.productsRepository.delete(id);
    }

    private normalizeImagesToUpdate(value: unknown): number[] {
        if (value === undefined || value === null) {
            return [];
        }

        const values = Array.isArray(value) ? value : [value];
        return values.map((entry) => Number(entry));
    }

}
