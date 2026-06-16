import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'cliente@email.com' })
  @IsEmail({}, { message: 'El email no es valido' })
  email: string;
}
