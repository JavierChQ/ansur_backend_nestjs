import { Module, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/user.entity';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthModule } from './jwt/jwt-auth.module';
import { CheckoutOrJwtAuthGuard } from './jwt/checkout-or-jwt-auth.guard';
import { RolesService } from 'src/roles/roles.service';
import { Rol } from 'src/roles/rol.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PasswordSetupToken } from './entities/password-setup-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { PasswordSetupService } from './password-setup.service';
import { PasswordResetService } from './password-reset.service';
import { AuthTokensCleanupService } from './auth-tokens-cleanup.service';
import { MailModule } from '../mail/mail.module';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    JwtAuthModule,
    TypeOrmModule.forFeature([User, Rol, PasswordSetupToken, PasswordResetToken]),
    forwardRef(() => MailModule),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            name: 'auth-sensitive',
            ttl: Number(configService.get<string>('AUTH_THROTTLE_TTL_MS') ?? 60_000),
            limit: Number(configService.get<string>('AUTH_THROTTLE_LIMIT') ?? 3),
          },
        ],
      }),
    }),
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
  providers: [
    AuthService,
    PasswordSetupService,
    PasswordResetService,
    AuthTokensCleanupService,
    RolesService,
    CheckoutOrJwtAuthGuard,
  ],
  controllers: [AuthController],
  exports: [JwtModule, JwtAuthModule, CheckoutOrJwtAuthGuard, PasswordSetupService],
})
export class AuthModule {}
