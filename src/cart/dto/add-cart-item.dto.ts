import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class AddCartItemDto {
  @ApiProperty({ example: 12 })
  @IsInt()
  @Min(1)
  id_product: number;

  @ApiProperty({ example: 2, description: 'Solo valida disponible; no reserva stock' })
  @IsInt()
  @Min(1)
  quantity: number;
}
