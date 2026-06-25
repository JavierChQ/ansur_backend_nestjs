import { ApiProperty } from '@nestjs/swagger';

export class MercadoPagoConfigDto {
  @ApiProperty({ example: 'TEST-xxxxxxxx' })
  public_key: string;

  @ApiProperty({ example: 'MPE' })
  site_id: string;

  @ApiProperty({ example: 'es-PE' })
  locale: string;

  @ApiProperty({ example: true, description: 'true si public_key usa prefijo TEST-' })
  sandbox: boolean;

  @ApiProperty({
    example: 100,
    description: 'Subtotal mínimo de productos (sin envío) para pagar online con Mercado Pago',
  })
  min_online_payment_amount: number;
}
