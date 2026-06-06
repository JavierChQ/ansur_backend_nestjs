import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class CheckoutDto {
  @ApiProperty({
    example: 3,
    description: 'Dirección de envío. Crea orden PENDIENTE_PAGO y reserva stock por 15 min.',
  })
  @IsInt()
  id_address: number;
}
