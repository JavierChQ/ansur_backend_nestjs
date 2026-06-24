import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ContactConfigDto {
  @ApiProperty({ example: '51947346467' })
  whatsapp: string;

  @ApiProperty({ example: '947 346 467' })
  whatsappDisplay: string;

  @ApiProperty({ example: 'https://wa.me/51947346467' })
  whatsappUrl: string;

  @ApiProperty({ example: 'Cal. Garci Carbajal nro 101, int. a-12' })
  address: string;

  @ApiProperty({ example: 'https://www.ansur.com.pe' })
  website: string;

  @ApiPropertyOptional({
    example: 'https://www.facebook.com/p/Ansel-peru-100063315543096/',
    nullable: true,
  })
  facebookUrl: string | null;

  @ApiPropertyOptional({
    example: 'https://www.tiktok.com/@anselperu',
    nullable: true,
  })
  tiktokUrl: string | null;
}
