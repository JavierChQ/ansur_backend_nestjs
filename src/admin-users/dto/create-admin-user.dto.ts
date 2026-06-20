import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateAdminUserDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  lastname: string;

  @IsNotEmpty()
  @IsString()
  @IsEmail({}, { message: 'El email no es valido' })
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6, { message: 'El telefono debe tener minimo 6 caracteres' })
  phone: string;
}
