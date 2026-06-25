import { ApiProperty } from '@nestjs/swagger';

export class ResetMercadoPagoCheckoutResponseDto {
  @ApiProperty({ example: 45 })
  order_id: number;

  @ApiProperty({ example: '2026-06-23T12:45:00.000Z' })
  expires_at: Date;

  @ApiProperty({
    example: null,
    nullable: true,
    enum: ['whatsapp', 'mercadopago'],
    description: 'Se limpia al volver a Mercado Pago',
  })
  payment_channel: string | null;
}
