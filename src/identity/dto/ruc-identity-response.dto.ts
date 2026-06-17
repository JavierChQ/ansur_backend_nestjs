import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RucIdentityResponseDto {
  @ApiProperty({ example: 'RUC' })
  doc_type: 'RUC';

  @ApiProperty({ example: '20131312955' })
  doc_number: string;

  @ApiProperty({ example: 'EMPRESA DEMO SAC' })
  razon_social: string;

  @ApiProperty({ example: 'AV. PRINCIPAL 123 LIMA LIMA LIMA' })
  direccion: string;

  @ApiPropertyOptional({ example: 'LIMA' })
  departamento: string | null;

  @ApiPropertyOptional({ example: 'LIMA' })
  provincia: string | null;

  @ApiPropertyOptional({ example: 'LIMA' })
  distrito: string | null;

  @ApiProperty({ example: 'ACTIVO' })
  estado: string;

  @ApiProperty({ example: 'HABIDO' })
  condicion: string;

  @ApiProperty({ example: '2026-06-16T12:00:00.000Z' })
  validated_at: string;

  @ApiProperty({ example: 'apisperu' })
  provider: 'apisperu';
}
