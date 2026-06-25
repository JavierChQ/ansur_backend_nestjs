import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ManualPaymentNotesDto {
  @ApiPropertyOptional({ example: 'Yape ref. 123456' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;
}
