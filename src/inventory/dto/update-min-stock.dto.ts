import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class UpdateMinStockDto {
  @ApiProperty({ example: 10, description: 'Umbral para alerta de stock bajo en panel admin' })
  @IsInt()
  @Min(0)
  min_stock: number;
}
