import { ApiProperty } from '@nestjs/swagger';

export class ProductPublicResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Remera XL' })
  name: string;

  @ApiProperty({ example: 'Descripción del producto' })
  description: string;

  @ApiProperty({ example: 'https://res.cloudinary.com/...', nullable: true })
  image1: string | null;

  @ApiProperty({ example: 'https://res.cloudinary.com/...', nullable: true })
  image2: string | null;

  @ApiProperty({ example: 3 })
  id_category: number;

  @ApiProperty({ example: 49.9 })
  sales_price: number;

  @ApiProperty({
    example: true,
    description: 'Indica si hay unidades disponibles',
  })
  in_stock: boolean;

  @ApiProperty({
    example: 12,
    description: 'Unidades disponibles para compra (quantity - reserved)',
  })
  available: number;
}
