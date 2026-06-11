import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateProductDto {

    @ApiProperty({ example: 'Remera XL' })
    @IsString()
    name: string;

    @ApiProperty({ example: 'Descripción del producto' })
    @IsString()
    description: string;

    @ApiProperty({ example: 49.9 })
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    price: number;

    @ApiProperty({ example: 3 })
    @Type(() => Number)
    @IsInt()
    id_category: number;

    @ApiPropertyOptional({ example: 50, description: 'Stock inicial al crear el producto' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    initial_stock?: number;

    @ApiPropertyOptional({ example: 10, description: 'Umbral de alerta en panel admin' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    min_stock?: number;

}
