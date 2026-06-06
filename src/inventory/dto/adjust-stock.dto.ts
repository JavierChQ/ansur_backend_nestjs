import { IsIn, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class AdjustStockDto {
  @IsInt()
  @Min(1)
  quantity: number;

  @IsIn(['IN', 'OUT'])
  direction: 'IN' | 'OUT';

  @IsString()
  @IsNotEmpty()
  reason: string;
}
