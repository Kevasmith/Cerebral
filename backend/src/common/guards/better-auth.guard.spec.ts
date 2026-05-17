import { UnauthorizedException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { BetterAuthGuard } from './better-auth.guard';

const mockGetSession = jest.fn();

jest.mock('../../auth/auth', () => ({
  auth: {
    api: {
      getSession: (...args: any[]) => mockGetSession(...args),
    },
  },
}));

jest.mock('better-auth/node', () => ({
  fromNodeHeaders: jest.fn().mockReturnValue({ authorization: 'Bearer test-token' }),
}));

function makeContext(headers: Record<string, string> = {}): ExecutionContext {
  const request = { headers, user: undefined as any };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('BetterAuthGuard', () => {
  let guard: BetterAuthGuard;

  beforeEach(() => {
    guard = new BetterAuthGuard();
    jest.clearAllMocks();
  });

  it('returns true and attaches user to request when session is valid', async () => {
    const user = { id: 'user-123', email: 'test@example.com' };
    mockGetSession.mockResolvedValue({ user });

    const ctx = makeContext();
    const result = await guard.canActivate(ctx);
    const req = ctx.switchToHttp().getRequest<{ user: typeof user }>();

    expect(result).toBe(true);
    expect(req.user).toEqual(user);
  });

  it('throws UnauthorizedException when session has no user', async () => {
    mockGetSession.mockResolvedValue({ user: null });

    await expect(guard.canActivate(makeContext())).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when getSession returns null', async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(guard.canActivate(makeContext())).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when getSession rejects', async () => {
    mockGetSession.mockRejectedValue(new Error('Network error'));

    await expect(guard.canActivate(makeContext())).rejects.toThrow();
  });
});
