import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { PasswordSetupToken } from './entities/password-setup-token.entity';

@Injectable()
export class AuthTokensCleanupService {
  private readonly logger = new Logger(AuthTokensCleanupService.name);

  constructor(
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokenRepository: Repository<PasswordResetToken>,
    @InjectRepository(PasswordSetupToken)
    private readonly passwordSetupTokenRepository: Repository<PasswordSetupToken>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpiredTokens(): Promise<void> {
    const now = new Date();
    const usedRetentionDate = new Date();
    usedRetentionDate.setDate(usedRetentionDate.getDate() - 7);

    const resetExpired = await this.passwordResetTokenRepository.delete({
      expires_at: LessThan(now),
    });
    const setupExpired = await this.passwordSetupTokenRepository.delete({
      expires_at: LessThan(now),
    });

    const resetUsed = await this.passwordResetTokenRepository
      .createQueryBuilder()
      .delete()
      .where('used_at IS NOT NULL AND used_at < :date', {
        date: usedRetentionDate,
      })
      .execute();

    const setupUsed = await this.passwordSetupTokenRepository
      .createQueryBuilder()
      .delete()
      .where('used_at IS NOT NULL AND used_at < :date', {
        date: usedRetentionDate,
      })
      .execute();

    const totalRemoved =
      (resetExpired.affected ?? 0) +
      (setupExpired.affected ?? 0) +
      (resetUsed.affected ?? 0) +
      (setupUsed.affected ?? 0);

    if (totalRemoved > 0) {
      this.logger.log(`Tokens de auth eliminados: ${totalRemoved}`);
    }
  }
}
