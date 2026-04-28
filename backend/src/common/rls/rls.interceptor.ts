import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { rlsContext } from './rls-context';

/**
 * Reads the Better Auth user ID that BetterAuthGuard placed on request.user,
 * then runs the rest of the request inside rlsContext so the pg pool hook
 * can emit the correct set_config before each query.
 *
 * Interceptors run after guards, so request.user is already populated.
 * Unauthenticated routes (no request.user) are passed through unchanged —
 * their queries will see app.current_user_id = '' and hit empty RLS results.
 */
@Injectable()
export class RlsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{ user?: { id: string } }>();
    const userId = req.user?.id;

    if (!userId) return next.handle();

    return new Observable((subscriber) => {
      rlsContext.run(userId, () => {
        next.handle().subscribe({
          next:     (v) => subscriber.next(v),
          error:    (e) => subscriber.error(e),
          complete: ()  => subscriber.complete(),
        });
      });
    });
  }
}
