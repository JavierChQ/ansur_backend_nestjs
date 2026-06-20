import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import { hash } from 'bcrypt';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { PasswordResetMailService } from '../mail/password-reset-mail.service';
import { User } from '../users/user.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { PasswordSetupService } from './password-setup.service';
import { isAdminPanelUser } from './jwt/app-role';
import { UserSessionService } from './user-session.service';

const GENERIC_FORGOT_MESSAGE =
  'Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    @InjectRepository(PasswordResetToken)
    private readonly tokenRepository: Repository<PasswordResetToken>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly passwordResetMailService: PasswordResetMailService,
    private readonly passwordSetupService: PasswordSetupService,
    private readonly configService: ConfigService,
    private readonly userSessionService: UserSessionService,
  ) {}

  async requestReset(email: string): Promise<{ message: string }> {
    const normalizedEmail = email.trim();
    const user = await this.usersRepository.findOne({
      where: { email: normalizedEmail },
      relations: ['roles'],
    });

    if (!user) {
      return { message: GENERIC_FORGOT_MESSAGE };
    }

    if (user.password_not_set) {
      try {
        await this.passwordSetupService.resendSetPasswordEmail(normalizedEmail);
      } catch (error) {
        if (error instanceof HttpException && error.getStatus() === HttpStatus.TOO_MANY_REQUESTS) {
          throw error;
        }
        this.logger.warn(
          `No se pudo enviar activación para ${normalizedEmail}: ${error instanceof Error ? error.message : error}`,
        );
      }
      return { message: GENERIC_FORGOT_MESSAGE };
    }

    const recentToken = await this.tokenRepository.findOne({
      where: {
        user_id: user.id,
        used_at: IsNull(),
        expires_at: MoreThan(new Date()),
      },
      order: { created_at: 'DESC' },
    });

    if (recentToken) {
      const cooldownMs = 2 * 60 * 1000;
      const elapsed = Date.now() - recentToken.created_at.getTime();
      if (elapsed < cooldownMs) {
        throw new HttpException(
          'Espera unos minutos antes de solicitar otro correo.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const rawToken = await this.createTokenForUser(user.id);
    await this.passwordResetMailService.sendResetPasswordEmail(
      user.email,
      user.name,
      rawToken,
      { useAdminFrontend: this.isAdminUser(user) },
    );

    return { message: GENERIC_FORGOT_MESSAGE };
  }

  async resetPassword(token: string, password: string) {
    const { user, storedToken } = await this.findValidToken(token);

    user.password = await hash(password, Number(process.env.HASH_SALT));
    await this.usersRepository.save(user);
    await this.userSessionService.invalidateUserSessions(user.id);

    storedToken.used_at = new Date();
    await this.tokenRepository.save(storedToken);

    return {
      message: 'Contraseña actualizada correctamente',
    };
  }

  private async createTokenForUser(userId: number): Promise<string> {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.getTokenTtlHours());

    await this.tokenRepository.update(
      { user_id: userId, used_at: IsNull() },
      { used_at: new Date() },
    );

    const token = this.tokenRepository.create({
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });
    await this.tokenRepository.save(token);

    return rawToken;
  }

  private async findValidToken(rawToken: string): Promise<{
    user: User;
    storedToken: PasswordResetToken;
  }> {
    const tokenHash = this.hashToken(rawToken);
    const storedToken = await this.tokenRepository.findOne({
      where: { token_hash: tokenHash },
      relations: ['user'],
    });

    if (!storedToken || storedToken.used_at) {
      throw new HttpException(
        'El enlace no es válido o ya fue utilizado',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (storedToken.expires_at < new Date()) {
      throw new HttpException(
        'El enlace expiró. Solicita uno nuevo.',
        HttpStatus.GONE,
      );
    }

    if (storedToken.user?.password_not_set) {
      throw new HttpException(
        'Esta cuenta aún no tiene contraseña. Revisa tu correo de activación.',
        HttpStatus.CONFLICT,
      );
    }

    return { user: storedToken.user, storedToken };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getTokenTtlHours(): number {
    const raw = this.configService.get<string>('PASSWORD_RESET_TOKEN_TTL_HOURS');
    const parsed = raw ? Number(raw) : 1;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }

  private isAdminUser(user: User): boolean {
    return isAdminPanelUser(user);
  }
}
