import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, ValidateNested } from 'class-validator';
import { GuestCustomerDto, GuestDeliveryDto } from './guest-checkout.dto';

export class UpdateCheckoutDeliveryDto {
  @ApiProperty({ type: GuestCustomerDto })
  @ValidateNested()
  @Type(() => GuestCustomerDto)
  customer: GuestCustomerDto;

  @ApiProperty({ type: GuestDeliveryDto })
  @ValidateNested()
  @Type(() => GuestDeliveryDto)
  delivery: GuestDeliveryDto;

  @ApiPropertyOptional({
    example: 3,
    description: 'Nueva dirección asociada (checkout autenticado)',
  })
  @IsOptional()
  @IsInt()
  id_address?: number;
}
