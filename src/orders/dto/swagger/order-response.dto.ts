import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderProductLineDto {
  @ApiProperty({ example: 12 })
  id_product: number;

  @ApiProperty({ example: 2 })
  quantity: number;
}

export class CheckoutOrderResponseDto {
  @ApiProperty({ example: 45 })
  id: number;

  @ApiProperty({ example: 'K7M2P9', description: 'Código alfanumérico público del pedido' })
  reference_code: string;

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

  @ApiPropertyOptional({ example: 'BOLETA', enum: ['BOLETA', 'FACTURA'] })
  invoice_type?: string;

  @ApiPropertyOptional({ example: 'DNI', enum: ['DNI', 'RUC'] })
  invoice_doc_type?: string;

  @ApiPropertyOptional({ example: '12345678' })
  invoice_doc_number?: string;

  @ApiPropertyOptional({ example: 'JUAN PEREZ QUISPE' })
  invoice_holder_name?: string;

  @ApiPropertyOptional({ example: 'EMPRESA DEMO SAC' })
  invoice_business_name?: string;

  @ApiPropertyOptional({ example: 'AV. PRINCIPAL 123 LIMA LIMA LIMA' })
  invoice_address?: string;

  @ApiPropertyOptional({ example: '2026-06-16T12:00:00.000Z' })
  invoice_validated_at?: Date;

  @ApiPropertyOptional({ example: 'apisperu' })
  invoice_validation_source?: string;
}
