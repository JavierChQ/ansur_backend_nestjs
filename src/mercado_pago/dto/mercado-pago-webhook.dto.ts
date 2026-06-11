import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';

class MercadoPagoWebhookDataDto {
  @ApiPropertyOptional({ example: '1234567890' })
  @IsOptional()
  @IsString()
  id?: string;
}

export class MercadoPagoWebhookDto {
  @ApiPropertyOptional({ example: 'payment' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: 'payment.updated' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ type: MercadoPagoWebhookDataDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MercadoPagoWebhookDataDto)
  data?: MercadoPagoWebhookDataDto;
}
