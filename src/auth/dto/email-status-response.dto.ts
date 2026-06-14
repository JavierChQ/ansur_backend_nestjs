import { ApiProperty } from '@nestjs/swagger';

export class EmailStatusResponseDto {
  @ApiProperty({ example: true })
  exists: boolean;

  @ApiProperty({ example: true })
  requires_login: boolean;

  @ApiProperty({ example: false, required: false })
  password_not_set?: boolean;
}
