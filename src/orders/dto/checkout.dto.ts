import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, ValidateNested } from 'class-validator';
import {
  DeliveryTypeDto,
  GuestCustomerDto,
  GuestDeliveryDto,
} from './guest-checkout.dto';

export class CheckoutDto {
  @ApiProperty({
    example: 3,
    description: 'Dirección de envío. Crea orden PENDIENTE_PAGO y reserva stock por 15 min.',
  })
  @IsInt()
  id_address: number;

  @ApiProperty({ type: GuestCustomerDto })
  @ValidateNested()
  @Type(() => GuestCustomerDto)
  customer: GuestCustomerDto;

  @ApiProperty({ type: GuestDeliveryDto })
  @ValidateNested()
  @Type(() => GuestDeliveryDto)
  delivery: GuestDeliveryDto;

  @ApiPropertyOptional({
    enum: DeliveryTypeDto,
    example: DeliveryTypeDto.DELIVERY,
    description: 'Opcional si ya viene en delivery.type',
  })
  @IsOptional()
  @IsEnum(DeliveryTypeDto)
  delivery_type?: DeliveryTypeDto;
}
