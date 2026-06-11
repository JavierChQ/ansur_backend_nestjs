import { Body, Controller, Delete, Get, Param, ParseFilePipe, ParseIntPipe, Post, Put, UploadedFiles, UseGuards, UseInterceptors } from "@nestjs/common";
import { ProductsService } from "./products.service";
import { HasRoles } from "src/auth/jwt/has-roles";
import { JwtRole } from "src/auth/jwt/jwt-role";
import { JwtAuthGuard } from "src/auth/jwt/jwt-auth.guard";
import { JwtRolesGuard } from "src/auth/jwt/jwt-roles.guard";
import { FilesInterceptor } from "@nestjs/platform-express";
import { UpdateProductDto } from "./dto/update-product.dto";
import { ApiBody, ApiConsumes, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiProtected } from "../common/decorators/api-protected.decorator";
import { ProductPublicResponseDto } from "./dto/swagger/product-public-response.dto";
import { CreateProductDto } from "./dto/create-product.dto";
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import {v2 as cloudinary} from 'cloudinary';
import { imageFileValidators } from '../common/validators/image-file.validators';

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
})

@ApiTags('products')
@Controller('products')
export class ProductsController {

    constructor(private productsService: ProductsService) {}

    // @HasRoles(JwtRole.ADMIN, JwtRole.CLIENT)
    // @UseGuards(JwtAuthGuard, JwtRolesGuard)
    @Get()
    @ApiOperation({
        summary: 'Listar productos del catálogo',
        description: 'Incluye in_stock (disponible/agotado) sin cantidad exacta.',
    })
    @ApiOkResponse({ type: [ProductPublicResponseDto] })
    findAll() {
        return this.productsService.findAll();
    }

    // @HasRoles(JwtRole.ADMIN, JwtRole.CLIENT)
    // @UseGuards(JwtAuthGuard, JwtRolesGuard)
    // @Get('pagination') // http:localhost:3000/categories -> GET
    // async pagination(
    //     @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    //     @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number = 5,
    // ): Promise<Pagination<Product>> {
    //     return this.productsService.paginate({
    //         page,
    //         limit,
    //         route: `http://${API}:3000/products/pagination`
    //     });
    // }

    // @HasRoles(JwtRole.ADMIN, JwtRole.CLIENT)
    // @UseGuards(JwtAuthGuard, JwtRolesGuard)
    @Get('category/:id_category')
    @ApiOperation({ summary: 'Productos por categoría con in_stock' })
    @ApiOkResponse({ type: [ProductPublicResponseDto] })
    findByCategory(@Param('id_category', ParseIntPipe) id_category: number) {
        return this.productsService.findByCategory(id_category);
    }
    
    @Get('search/:name')
    @ApiOperation({ summary: 'Buscar productos por nombre con in_stock' })
    @ApiOkResponse({ type: [ProductPublicResponseDto] })
    findByName(@Param('name') name: string) {
        return this.productsService.findByName(name);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Detalle de producto con in_stock' })
    @ApiOkResponse({ type: ProductPublicResponseDto })
    findById(@Param('id', ParseIntPipe) id: number) {
        return this.productsService.findById(id);
    }

    @HasRoles(JwtRole.ADMIN)
    @UseGuards(JwtAuthGuard, JwtRolesGuard)
    @ApiProtected()
    @Post()
    @ApiOperation({
        summary: 'Crear producto con imágenes e inventario inicial',
        description: 'Opcionalmente enviar initial_stock y min_stock en el body.',
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            required: ['name', 'description', 'price', 'id_category', 'files[]'],
            properties: {
                name: { type: 'string', example: 'Remera XL' },
                description: { type: 'string', example: 'Descripción' },
                price: { type: 'number', example: 49.9 },
                id_category: { type: 'integer', example: 3 },
                initial_stock: { type: 'integer', example: 50, description: 'Stock inicial' },
                min_stock: { type: 'integer', example: 10, description: 'Umbral de alerta admin' },
                'files[]': { type: 'array', items: { type: 'string', format: 'binary' } },
            },
        },
    })
    @UseInterceptors(FilesInterceptor('files[]', 2, {storage}))
    create(
        @UploadedFiles(
            new ParseFilePipe({
                validators: imageFileValidators,
              }),
        ) files: Array<Express.Multer.File>,
        @Body() product: CreateProductDto
    ) {
        console.log('Files: ', files);
        console.log('Product: ', product);
        
        return this.productsService.create(files, product);
    }
    
    @HasRoles(JwtRole.ADMIN)
    @UseGuards(JwtAuthGuard, JwtRolesGuard)
    @Put('upload/:id') // http:localhost:3000/categories -> PUT
    @UseInterceptors(FilesInterceptor('files[]', 2, {storage}))
    updateWithImage(
        @UploadedFiles(
            new ParseFilePipe({
                validators: imageFileValidators,
              }),
        ) files: Array<Express.Multer.File>,
        @Param('id', ParseIntPipe) id: number,
        @Body() product: UpdateProductDto
    ) {
        console.log('PRoduct: ', product);
        
        return this.productsService.updateWithImages(files, id, product);
    }
    
    @HasRoles(JwtRole.ADMIN)
    @UseGuards(JwtAuthGuard, JwtRolesGuard)
    @Put(':id') // http:localhost:3000/categories -> PUT
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() product: UpdateProductDto
    ) {
        return this.productsService.update(id, product);
    }
    
    @HasRoles(JwtRole.ADMIN)
    @UseGuards(JwtAuthGuard, JwtRolesGuard)
    @Delete(':id') // http:localhost:3000/categories -> PUT
    delete(
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.productsService.delete(id);
    }

}