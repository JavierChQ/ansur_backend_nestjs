import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class MigrateLegacyGuestUsersDto {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  @ApiPropertyOptional({
    default: false,
    description: 'Envía correo de activación a cada usuario migrado',
  })
  @IsOptional()
  @IsBoolean()
  sendActivationEmails?: boolean;

  @ApiPropertyOptional({
    default: 120,
    description: 'Segundos máximos entre creación de usuario y su primera orden',
  })
  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(3600)
  proximitySeconds?: number;
}
