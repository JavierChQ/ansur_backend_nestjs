import { ApiProperty } from '@nestjs/swagger';

export class InventoryAdminResponseDto {
  @ApiProperty({ example: 1 })
  id_product: number;

  @ApiProperty({ example: 'Remera XL' })
  name: string;

  @ApiProperty({ example: 50, description: 'Stock físico en almacén' })
  quantity: number;

  @ApiProperty({ example: 3, description: 'Unidades reservadas en checkouts pendientes' })
  reserved: number;

  @ApiProperty({ example: 47, description: 'quantity - reserved' })
  available: number;

  @ApiProperty({ example: 10, description: 'Umbral de alerta en panel admin' })
  min_stock: number;

  @ApiProperty({ example: false })
  is_low_stock: boolean;

  @ApiProperty({ example: false })
  is_out_of_stock: boolean;

  @ApiProperty({ example: '2026-06-05T12:00:00.000Z' })
  updated_at: Date;
}

export class StockSummaryResponseDto {
  @ApiProperty({ example: 120 })
  total_products: number;

  @ApiProperty({ example: 8 })
  low_stock_count: number;

  @ApiProperty({ example: 2 })
  out_of_stock_count: number;
}

export class StockMovementResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 12 })
  id_product: number;

  @ApiProperty({
    example: 'INGRESO',
    enum: ['INGRESO', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO', 'RESERVA', 'LIBERACION', 'VENTA', 'DEVOLUCION'],
  })
  type: string;

  @ApiProperty({ example: 20 })
  quantity: number;

  @ApiProperty({ example: 70 })
  balance_after: number;

  @ApiProperty({ example: 1, nullable: true })
  id_user: number | null;

  @ApiProperty({ example: 45, nullable: true })
  id_order: number | null;

  @ApiProperty({ example: 'Reposición proveedor', nullable: true })
  notes: string | null;

  @ApiProperty({ example: '2026-06-05T12:00:00.000Z' })
  created_at: Date;
}
