import { of, throwError, firstValueFrom, toArray } from 'rxjs';
import { ExecutionContext } from '@nestjs/common';
import { RlsInterceptor } from './rls.interceptor';

const mockRlsRun = jest.fn().mockImplementation((_userId: string, fn: () => void) => fn());

jest.mock('./rls-context', () => ({
  rlsContext: {
    run: (...args: any[]) => mockRlsRun(...args),
  },
}));

function makeContext(userId?: string): ExecutionContext {
  const request: { user?: { id: string } } = userId ? { user: { id: userId } } : {};
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function makeNext(value: unknown = 'response') {
  return { handle: jest.fn().mockReturnValue(of(value)) };
}

describe('RlsInterceptor', () => {
  let interceptor: RlsInterceptor;

  beforeEach(() => {
    interceptor = new RlsInterceptor();
    jest.clearAllMocks();
    mockRlsRun.mockImplementation((_userId: string, fn: () => void) => fn());
  });

  it('passes the request through rlsContext.run with the correct userId', async () => {
    const ctx  = makeContext('user-abc');
    const next = makeNext('data');

    const obs    = interceptor.intercept(ctx, next);
    const result = await firstValueFrom(obs);

    expect(result).toBe('data');
    expect(mockRlsRun).toHaveBeenCalledTimes(1);
    expect(mockRlsRun).toHaveBeenCalledWith('user-abc', expect.any(Function));
  });

  it('skips rlsContext.run and calls next.handle directly for unauthenticated requests', async () => {
    const ctx  = makeContext(); // no userId
    const next = makeNext('public-data');

    const obs    = interceptor.intercept(ctx, next);
    const result = await firstValueFrom(obs);

    expect(result).toBe('public-data');
    expect(mockRlsRun).not.toHaveBeenCalled();
    expect(next.handle).toHaveBeenCalledTimes(1);
  });

  it('forwards multiple emissions from next.handle', async () => {
    const ctx  = makeContext('user-xyz');
    const next = { handle: jest.fn().mockReturnValue(of(1, 2, 3)) };

    const obs    = interceptor.intercept(ctx, next);
    const values = await firstValueFrom(obs.pipe(toArray()));

    expect(values).toEqual([1, 2, 3]);
  });

  it('propagates errors emitted by next.handle', async () => {
    const ctx  = makeContext('user-err');
    const next = { handle: jest.fn().mockReturnValue(throwError(() => new Error('upstream error'))) };

    const obs = interceptor.intercept(ctx, next);

    await expect(firstValueFrom(obs)).rejects.toThrow('upstream error');
  });
});
