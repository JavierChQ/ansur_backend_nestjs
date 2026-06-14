import { Module, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/user.entity';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt/jwt.strategy';
import { CheckoutOrJwtAuthGuard } from './jwt/checkout-or-jwt-auth.guard';
import { RolesService } from 'src/roles/roles.service';
import { Rol } from 'src/roles/rol.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PasswordSetupToken } from './entities/password-setup-token.entity';
import { PasswordSetupService } from './password-setup.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Rol, PasswordSetupToken]),
    forwardRef(() => MailModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: "1d" },
        global: true,
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, PasswordSetupService, RolesService, JwtStrategy, CheckoutOrJwtAuthGuard],
  controllers: [AuthController],
  exports: [JwtModule, CheckoutOrJwtAuthGuard, PasswordSetupService],
})
export class AuthModule {}
