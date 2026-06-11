import { ApiProperty } from '@nestjs/swagger';

export class MercadoPagoConfigDto {
  @ApiProperty({ example: 'TEST-xxxxxxxx' })
  public_key: string;

  @ApiProperty({ example: 'MPE' })
  site_id: string;

  @ApiProperty({ example: 'es-PE' })
  locale: string;
}
