import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class RestockDto {
  @ApiProperty({ example: 50, description: 'Cantidad a ingresar al almacén' })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: 'Reposición proveedor - Remito #1234' })
  @IsOptional()
  @IsString()
  notes?: string;
}
