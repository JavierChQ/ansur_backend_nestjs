import { ApiProperty } from '@nestjs/swagger';

export class DniIdentityResponseDto {
  @ApiProperty({ example: 'DNI' })
  doc_type: 'DNI';

  @ApiProperty({ example: '12345678' })
  doc_number: string;

  @ApiProperty({ example: 'JUAN' })
  nombres: string;

  @ApiProperty({ example: 'PEREZ' })
  apellido_paterno: string;

  @ApiProperty({ example: 'QUISPE' })
  apellido_materno: string;

  @ApiProperty({ example: 'JUAN PEREZ QUISPE' })
  nombre_completo: string;

  @ApiProperty({ example: '2026-06-16T12:00:00.000Z' })
  validated_at: string;

  @ApiProperty({ example: 'apisperu' })
  provider: 'apisperu';
}
