import { Type, Transform } from 'class-transformer';
import { IsArray, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateProductDto {

    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    price?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    id_category?: number;

    @IsOptional()
    @IsString()
    image1?: string;

    @IsOptional()
    @IsString()
    image2?: string;

    @IsOptional()
    @Transform(({ value }) => {
        if (value === undefined || value === null) {
            return undefined;
        }
        const values = Array.isArray(value) ? value : [value];
        return values.map((entry) => Number(entry));
    })
    @IsArray()
    @IsInt({ each: true })
    images_to_update?: number[];

}
