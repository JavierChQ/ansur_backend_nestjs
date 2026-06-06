import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateProductDto {

    @ApiProperty({ example: 'Remera XL' })
    @IsString()
    name: string;

    @ApiProperty({ example: 'Descripción del producto' })
    @IsString()
    description: string;

    @ApiProperty({ example: 49.9 })
    @IsNumber()
    @Min(0)
    price: number;

    @ApiProperty({ example: 3 })
    @IsInt()
    id_category: number;

    @ApiPropertyOptional({ example: 50, description: 'Stock inicial al crear el producto' })
    @IsOptional()
    @IsInt()
    @Min(0)
    initial_stock?: number;

    @ApiPropertyOptional({ example: 10, description: 'Umbral de alerta en panel admin' })
    @IsOptional()
    @IsInt()
    @Min(0)
    min_stock?: number;

}