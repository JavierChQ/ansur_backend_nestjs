import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEmail, IsInt, IsNotEmpty, IsString, Min, ValidateNested } from 'class-validator';

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

  @ApiProperty({ type: IdentificationDto })
  @ValidateNested()
  @Type(() => IdentificationDto)
  identification: IdentificationDto;
}

export class PaymentBodyDto {
  @ApiProperty({ example: 99.8, description: 'Monto total de la orden' })
  @IsInt()
  @Min(1)
  transaction_amount: number;

  @ApiProperty({ description: 'Token de tarjeta generado por Mercado Pago' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  installments: number;

  @ApiProperty({ example: '310' })
  @IsString()
  @IsNotEmpty()
  issuer_id: string;

  @ApiProperty({ example: 'visa' })
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
