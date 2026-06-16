import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { jwtConstants } from './jwt.constants';
import { UserSessionService } from '../user-session.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly userSessionService: UserSessionService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret,
    });
  }

  async validate(payload: {
    id: number;
    name: string;
    roles: string[];
    token_version?: number;
  }) {
    await this.userSessionService.assertValidTokenVersion(
      payload.id,
      payload.token_version,
    );

    return {
      userId: payload.id,
      username: payload.name,
      roles: payload.roles,
    };
  }
}