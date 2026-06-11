import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductAdminResponseDto {
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

  @ApiProperty({ example: 25 })
  purchase_price: number;

  @ApiProperty({ example: 49.9 })
  sale_price: number;

  @ApiProperty({
    example: true,
    description: 'Indica si hay unidades disponibles (sin mostrar cantidad exacta)',
  })
  in_stock: boolean;

  @ApiProperty({ example: 12, description: 'Unidades disponibles para compra' })
  available: number;

  @ApiPropertyOptional({
    example: 'El precio de venta es menor al precio de compra',
    description: 'Advertencia cuando sale_price < purchase_price',
  })
  price_warning?: string;
}
