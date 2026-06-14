import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CHECKOUT_JWT_SUB } from '../../common/constants/checkout-auth.constants';

@Injectable()
export class CheckoutOrJwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = this.extractBearerToken(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException();
    }

    let payload: {
      sub?: string;
      order_id?: number;
      email?: string;
      id?: number;
      name?: string;
      roles?: string[];
    };

    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException();
    }

    if (payload.sub === CHECKOUT_JWT_SUB) {
      if (!payload.order_id || !payload.email) {
        throw new UnauthorizedException();
      }

      request.checkoutAuth = {
        orderId: payload.order_id,
        email: payload.email,
      };
      return true;
    }

    if (payload.id) {
      request.user = {
        userId: payload.id,
        username: payload.name,
        roles: payload.roles ?? [],
      };
      return true;
    }

    throw new UnauthorizedException();
  }

  private extractBearerToken(authorization?: string): string | null {
    if (!authorization) {
      return null;
    }

    const [type, token] = authorization.split(' ');
    return type === 'Bearer' && token ? token : null;
  }
}
