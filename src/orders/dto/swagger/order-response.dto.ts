import { ApiProperty } from '@nestjs/swagger';

export class OrderProductLineDto {
  @ApiProperty({ example: 12 })
  id_product: number;

  @ApiProperty({ example: 2 })
  quantity: number;
}

export class CheckoutOrderResponseDto {
  @ApiProperty({ example: 45 })
  id: number;

  @ApiProperty({ example: 1 })
  id_client: number;

  @ApiProperty({ example: 3 })
  id_address: number;

  @ApiProperty({ example: 99.8 })
  amount: number;

  @ApiProperty({
    example: 'PENDIENTE_PAGO',
    enum: ['PENDIENTE_PAGO', 'PAGADO', 'CANCELADO', 'EXPIRADO', 'DESPACHADO', 'REEMBOLSADO'],
  })
  status: string;

  @ApiProperty({
    example: '2026-06-05T12:15:00.000Z',
    description: 'Expiración del checkout (15 min por defecto)',
  })
  expires_at: Date;

  @ApiProperty({ type: [OrderProductLineDto] })
  orderHasProducts: OrderProductLineDto[];
}
