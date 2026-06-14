import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PasswordSetupService } from '../auth/password-setup.service';
import { OrderStatus } from '../orders/enums/order-status.enum';
import { User } from './user.entity';

export interface LegacyGuestMigrationOptions {
  dryRun?: boolean;
  sendActivationEmails?: boolean;
  proximitySeconds?: number;
}

export interface LegacyGuestMigrationResult {
  dryRun: boolean;
  candidates: number;
  updated: number;
  userIds: number[];
  activationEmailsSent: number;
}

@Injectable()
export class LegacyGuestMigrationService {
  private readonly logger = new Logger(LegacyGuestMigrationService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly passwordSetupService: PasswordSetupService,
  ) {}

  async run(options: LegacyGuestMigrationOptions = {}): Promise<LegacyGuestMigrationResult> {
    const dryRun = options.dryRun ?? false;
    const proximitySeconds = options.proximitySeconds ?? 120;
    const userIds = await this.findLegacyCandidateIds(proximitySeconds);

    if (!userIds.length) {
      return {
        dryRun,
        candidates: 0,
        updated: 0,
        userIds: [],
        activationEmailsSent: 0,
      };
    }

    if (!dryRun) {
      await this.usersRepository.update(
        { id: In(userIds) },
        { is_guest: true, password_not_set: true },
      );
      this.logger.log(`Migrados ${userIds.length} usuarios legacy a guest`);
    }

    let activationEmailsSent = 0;
    if (!dryRun && options.sendActivationEmails) {
      for (const userId of userIds) {
        try {
          await this.passwordSetupService.createAndSendActivationEmail(userId);
          activationEmailsSent += 1;
        } catch (error) {
          this.logger.warn(
            `No se pudo enviar activación al usuario ${userId}`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }
    }

    return {
      dryRun,
      candidates: userIds.length,
      updated: dryRun ? 0 : userIds.length,
      userIds,
      activationEmailsSent,
    };
  }

  private async findLegacyCandidateIds(proximitySeconds: number): Promise<number[]> {
    const rows = await this.usersRepository.query(
      `
        SELECT u.id AS id
        FROM users u
        INNER JOIN user_has_roles uhr ON uhr.id_user = u.id AND uhr.id_rol = 'CLIENT'
        INNER JOIN orders o ON o.id_client = u.id
        LEFT JOIN password_setup_tokens pst ON pst.user_id = u.id AND pst.used_at IS NOT NULL
        WHERE u.deleted_at IS NULL
          AND u.is_guest = 0
          AND u.password_not_set = 0
          AND pst.id IS NULL
          AND o.status IN (?, ?, ?)
        GROUP BY u.id
        HAVING MIN(ABS(TIMESTAMPDIFF(SECOND, u.created_at, o.created_at))) <= ?
      `,
      [OrderStatus.PAGADO, OrderStatus.DESPACHADO, OrderStatus.PENDIENTE_PAGO, proximitySeconds],
    );

    return rows
      .map((row: { id: number | string }) => Number(row.id))
      .filter((id: number) => Number.isInteger(id));
  }
}
