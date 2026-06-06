import { IsInt, IsOptional, Min } from 'class-validator';

export class CreateProductDto {

    name: string;
    description: string;
    price: number;
    id_category: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    initial_stock?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    min_stock?: number;

}