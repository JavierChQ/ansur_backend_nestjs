import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

class IdentificationDto {
  @ApiProperty({ example: 'DNI' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ example: '12345678' })
  @IsString()
  @IsNotEmpty()
  number: string;
}

class PayerDto {
  @ApiProperty({ example: 'cliente@email.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ type: IdentificationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => IdentificationDto)
  identification?: IdentificationDto;
}

export class PaymentBodyDto {
  @ApiProperty({ example: 99.8, description: 'Monto total de la orden' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  transaction_amount: number;

  @ApiProperty({ description: 'Token generado por el SDK de Mercado Pago' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  installments: number;

  @ApiPropertyOptional({
    example: '310',
    description: 'Requerido para pagos con tarjeta; omitir para Yape',
  })
  @ValidateIf((dto: PaymentBodyDto) => dto.payment_method_id !== 'yape')
  @IsString()
  @IsNotEmpty()
  issuer_id?: string;

  @ApiProperty({ example: 'visa', description: 'visa, master, etc. o "yape"' })
  @IsString()
  @IsNotEmpty()
  payment_method_id: string;

  @ApiProperty({ type: PayerDto })
  @ValidateNested()
  @Type(() => PayerDto)
  payer: PayerDto;

  @ApiProperty({
    example: 45,
    description: 'ID de la orden creada previamente en POST /orders/checkout',
  })
  @IsInt()
  @Min(1)
  order_id: number;
}
