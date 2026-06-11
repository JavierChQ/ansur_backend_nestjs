import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const result = super.canActivate(context);

    if (result instanceof Observable) {
      return result.pipe(catchError(() => of(true)));
    }

    if (result instanceof Promise) {
      return result.catch(() => true);
    }

    return result;
  }

  handleRequest<TUser>(err: Error | null, user: TUser): TUser | null {
    if (err || !user) {
      return null;
    }
    return user;
  }
}
