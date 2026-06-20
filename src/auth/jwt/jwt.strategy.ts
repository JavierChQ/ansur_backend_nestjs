import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { jwtConstants } from './jwt.constants';
import { UserSessionService } from '../user-session.service';
import { AuthTokenPayload } from '../auth-token.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly userSessionService: UserSessionService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret,
    });
  }

  async validate(payload: AuthTokenPayload) {
    await this.userSessionService.assertValidTokenVersion(
      payload.id,
      payload.token_version,
    );

    const role = payload.role ?? payload.roles?.[0] ?? 'CLIENT';
    const roles = payload.roles?.length ? payload.roles : [role];

    return {
      userId: payload.id,
      username: payload.name,
      role,
      roles,
      permissions: payload.permissions ?? [],
    };
  }
}
