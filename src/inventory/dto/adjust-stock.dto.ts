import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class AdjustStockDto {
  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 'IN', enum: ['IN', 'OUT'], description: 'IN: suma stock, OUT: resta stock' })
  @IsIn(['IN', 'OUT'])
  direction: 'IN' | 'OUT';

  @ApiProperty({ example: 'Corrección por inventario físico' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
