import { IsInt, Min } from 'class-validator';

export class UpdateMinStockDto {
  @IsInt()
  @Min(0)
  min_stock: number;
}
