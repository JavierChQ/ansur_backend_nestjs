import { IsInt } from 'class-validator';

export class CheckoutDto {
  @IsInt()
  id_address: number;
}
