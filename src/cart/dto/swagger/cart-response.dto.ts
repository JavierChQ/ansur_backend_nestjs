import { ApiProperty } from '@nestjs/swagger';

export class CartItemResponseDto {
  @ApiProperty({ example: 12 })
  id_product: number;

  @ApiProperty({ example: 'Remera XL' })
  name: string;

  @ApiProperty({ example: 49.9 })
  price: number;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty({ example: true })
  in_stock: boolean;
}

export class CartResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'ACTIVE', enum: ['ACTIVE', 'CHECKED_OUT', 'ABANDONED'] })
  status: string;

  @ApiProperty({ example: '2026-06-12T12:00:00.000Z' })
  expires_at: Date;

  @ApiProperty({ type: [CartItemResponseDto] })
  items: CartItemResponseDto[];

  @ApiProperty({ example: 99.8 })
  total: number;
}
