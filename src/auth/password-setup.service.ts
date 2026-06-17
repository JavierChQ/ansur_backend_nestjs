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
import { AccountActivationService } from '../mail/account-activation.service';
import { User } from '../users/user.entity';
import { PasswordSetupToken } from './entities/password-setup-token.entity';
import { UserSessionService } from './user-session.service';

@Injectable()
export class PasswordSetupService {
  private readonly logger = new Logger(PasswordSetupService.name);

  constructor(
    @InjectRepository(PasswordSetupToken)
    private readonly tokenRepository: Repository<PasswordSetupToken>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly accountActivationService: AccountActivationService,
    private readonly configService: ConfigService,
    private readonly userSessionService: UserSessionService,
  ) {}

  async createAndSendActivationEmail(
    userId: number,
    orderReference?: string,
  ): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      this.logger.warn(`Usuario ${userId} no encontrado; activación omitida`);
      return;
    }

    if (!user.password_not_set) {
      this.logger.debug(`Usuario ${userId} ya tiene contraseña; activación omitida`);
      return;
    }

    const rawToken = await this.createTokenForUser(user.id);
    await this.accountActivationService.sendSetPasswordEmail(
      user.email,
      user.name,
      rawToken,
      orderReference,
    );
  }

  async resendSetPasswordEmail(email: string): Promise<{ message: string }> {
    const user = await this.usersRepository.findOneBy({ email });

    if (!user?.password_not_set) {
      return {
        message:
          'Si tu cuenta requiere activación, recibirás un correo con instrucciones.',
      };
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
    await this.accountActivationService.sendSetPasswordEmail(
      user.email,
      user.name,
      rawToken,
    );

    return {
      message:
        'Si tu cuenta requiere activación, recibirás un correo con instrucciones.',
    };
  }

  async setPassword(token: string, password: string) {
    const { user, storedToken } = await this.findValidToken(token);

    user.password = await hash(password, Number(process.env.HASH_SALT));
    user.password_not_set = false;
    await this.usersRepository.save(user);
    await this.userSessionService.invalidateUserSessions(user.id);

    storedToken.used_at = new Date();
    await this.tokenRepository.save(storedToken);

    const rolesIds = user.roles?.map((rol) => rol.id) ?? ['CLIENT'];

    return {
      message: 'Contraseña creada correctamente',
      user: {
        id: user.id,
        name: user.name,
        lastname: user.lastname,
        email: user.email,
        phone: user.phone,
        password_not_set: false,
        roles: rolesIds,
      },
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
    storedToken: PasswordSetupToken;
  }> {
    const tokenHash = this.hashToken(rawToken);
    const storedToken = await this.tokenRepository.findOne({
      where: { token_hash: tokenHash },
      relations: ['user', 'user.roles'],
    });

    if (!storedToken || storedToken.used_at) {
      throw new HttpException('El enlace no es válido o ya fue utilizado', HttpStatus.BAD_REQUEST);
    }

    if (storedToken.expires_at < new Date()) {
      throw new HttpException('El enlace expiró. Solicita uno nuevo.', HttpStatus.GONE);
    }

    if (!storedToken.user?.password_not_set) {
      throw new HttpException('Esta cuenta ya tiene contraseña', HttpStatus.CONFLICT);
    }

    return { user: storedToken.user, storedToken };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getTokenTtlHours(): number {
    const raw = this.configService.get<string>('PASSWORD_SETUP_TOKEN_TTL_HOURS');
    const parsed = raw ? Number(raw) : 72;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 72;
  }
}
