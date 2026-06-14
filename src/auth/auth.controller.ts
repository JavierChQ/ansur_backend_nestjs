import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { RegisterAuthDto } from './dto/register-auth.dto';
import { AuthService } from './auth.service';
import { LoginAuthDto } from './dto/login-auth.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { ResendSetPasswordDto } from './dto/resend-set-password.dto';
import { PasswordSetupService } from './password-setup.service';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiGoneResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { EmailStatusQueryDto } from './dto/email-status-query.dto';
import { EmailStatusResponseDto } from './dto/email-status-response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    
    constructor(
        private authService: AuthService,
        private passwordSetupService: PasswordSetupService,
    ) {}

    @Post('register') // http://localhost/auth/register -> POST 
    register(@Body() user: RegisterAuthDto) {
        return this.authService.register(user);
    }

    @Post('login') // http://localhost/auth/login -> POST 
    login(@Body() loginData: LoginAuthDto) {
        return this.authService.login(loginData);
    }

    @Post('set-password')
    @ApiOperation({ summary: 'Definir contraseña con token de activación' })
    @ApiOkResponse({ description: 'Contraseña creada' })
    @ApiBadRequestResponse({ description: 'Token inválido o ya usado' })
    @ApiGoneResponse({ description: 'Token expirado' })
    @ApiConflictResponse({ description: 'La cuenta ya tiene contraseña' })
    setPassword(@Body() dto: SetPasswordDto) {
        return this.passwordSetupService.setPassword(dto.token, dto.password);
    }

    @Post('resend-set-password')
    @ApiOperation({ summary: 'Reenviar correo para definir contraseña' })
    @ApiOkResponse({ description: 'Solicitud procesada' })
    @ApiTooManyRequestsResponse({ description: 'Demasiadas solicitudes' })
    resendSetPassword(@Body() dto: ResendSetPasswordDto) {
        return this.passwordSetupService.resendSetPasswordEmail(dto.email);
    }

    @Get('email-status')
    @ApiOperation({
        summary: 'Comprobar si un email ya está registrado',
        description:
            'Usado en checkout invitado para decidir si pedir inicio de sesión.',
    })
    @ApiOkResponse({ type: EmailStatusResponseDto })
    getEmailStatus(@Query() query: EmailStatusQueryDto) {
        return this.authService.getEmailStatus(query.email);
    }
}
