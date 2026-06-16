import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';

@Injectable()
export class UserSessionService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async assertValidTokenVersion(
    userId: number,
    tokenVersion?: number,
  ): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: ['id', 'token_version'],
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    const expected = user.token_version ?? 0;
    const received = tokenVersion ?? 0;

    if (received !== expected) {
      throw new UnauthorizedException(
        'Sesión expirada. Inicia sesión nuevamente.',
      );
    }
  }

  async invalidateUserSessions(userId: number): Promise<void> {
    await this.usersRepository.increment({ id: userId }, 'token_version', 1);
  }
}
