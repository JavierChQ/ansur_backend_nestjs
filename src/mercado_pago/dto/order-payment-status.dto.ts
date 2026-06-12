import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderPaymentStatusDto {
  @ApiProperty({ example: 45 })
  order_id: number;

  @ApiProperty({ example: 'PENDIENTE_PAGO' })
  status: string;

  @ApiPropertyOptional({ example: '74581527758' })
  payment_id?: string | null;

  @ApiPropertyOptional({ example: '2026-06-11T15:30:00.000Z' })
  expires_at?: Date | null;
}
