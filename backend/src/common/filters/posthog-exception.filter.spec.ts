// Mock posthog before importing the filter so the module sees the mock.
jest.mock('../../posthog', () => ({
  posthog: { captureException: jest.fn() },
}));

import { HttpException, HttpStatus } from '@nestjs/common';
import { PostHogExceptionFilter } from './posthog-exception.filter';
import { posthog } from '../../posthog';

const mockCaptureException = posthog.captureException as jest.Mock;

// ── host factory ──────────────────────────────────────────────────────────────

function makeHost(
  opts: { url?: string; method?: string; userId?: string } = {},
): { host: any; mockStatus: jest.Mock; mockJson: jest.Mock } {
  const mockJson   = jest.fn();
  const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
  const mockRequest = {
    url:    opts.url    ?? '/test',
    method: opts.method ?? 'GET',
    user:   opts.userId ? { id: opts.userId } : undefined,
  };

  const host = {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest:  jest.fn().mockReturnValue(mockRequest),
      getResponse: jest.fn().mockReturnValue({ status: mockStatus }),
    }),
  };

  return { host, mockStatus, mockJson };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('PostHogExceptionFilter', () => {
  let filter: PostHogExceptionFilter;

  beforeEach(() => {
    filter = new PostHogExceptionFilter();
    jest.clearAllMocks();
  });

  // ── status code selection ──────────────────────────────────────────────────

  describe('status code selection', () => {
    it('uses the HttpException status for HTTP errors', () => {
      const { host, mockStatus } = makeHost();
      const ex = new HttpException('Not Found', HttpStatus.NOT_FOUND);

      filter.catch(ex, host);

      expect(mockStatus).toHaveBeenCalledWith(404);
    });

    it('defaults to 500 for non-HttpException errors', () => {
      const { host, mockStatus } = makeHost();

      filter.catch(new Error('boom'), host);

      expect(mockStatus).toHaveBeenCalledWith(500);
    });
  });

  // ── response body ─────────────────────────────────────────────────────────

  describe('response body', () => {
    it('returns the HttpException response body for HTTP errors', () => {
      const { host, mockJson } = makeHost();
      const ex = new HttpException({ code: 'NOT_FOUND', msg: 'missing' }, 404);

      filter.catch(ex, host);

      expect(mockJson).toHaveBeenCalledWith({ code: 'NOT_FOUND', msg: 'missing' });
    });

    it('returns a standard 500 body for generic errors', () => {
      const { host, mockJson } = makeHost();

      filter.catch(new Error('unexpected'), host);

      expect(mockJson).toHaveBeenCalledWith({
        statusCode: 500,
        message: 'Internal server error',
      });
    });
  });

  // ── PostHog capture ────────────────────────────────────────────────────────

  describe('PostHog capture', () => {
    it('captures 5xx HttpException errors to PostHog', () => {
      const { host } = makeHost();
      const ex = new HttpException('Server Error', 500);

      filter.catch(ex, host);

      expect(mockCaptureException).toHaveBeenCalledTimes(1);
    });

    it('captures generic (non-HttpException) errors to PostHog', () => {
      const { host } = makeHost();

      filter.catch(new Error('boom'), host);

      expect(mockCaptureException).toHaveBeenCalledTimes(1);
    });

    it('does NOT capture 4xx client errors to PostHog', () => {
      const { host } = makeHost();
      const ex = new HttpException('Bad Request', 400);

      filter.catch(ex, host);

      expect(mockCaptureException).not.toHaveBeenCalled();
    });

    it('does NOT capture 404 errors to PostHog', () => {
      const { host } = makeHost();
      const ex = new HttpException('Not Found', 404);

      filter.catch(ex, host);

      expect(mockCaptureException).not.toHaveBeenCalled();
    });

    it('passes the exception itself as the first argument', () => {
      const { host } = makeHost({ userId: 'user-x' });
      const ex = new Error('the error');

      filter.catch(ex, host);

      expect(mockCaptureException.mock.calls[0][0]).toBe(ex);
    });

    it('passes the userId from request.user.id', () => {
      const { host } = makeHost({ userId: 'user-abc' });

      filter.catch(new Error('boom'), host);

      expect(mockCaptureException).toHaveBeenCalledWith(
        expect.anything(),
        'user-abc',
        expect.anything(),
      );
    });

    it('passes undefined userId when request.user is absent', () => {
      const { host } = makeHost(); // no userId

      filter.catch(new Error('boom'), host);

      expect(mockCaptureException).toHaveBeenCalledWith(
        expect.anything(),
        undefined,
        expect.anything(),
      );
    });

    it('includes url, method, and status_code in the context', () => {
      const { host } = makeHost({ url: '/api/data', method: 'POST' });

      filter.catch(new Error('boom'), host);

      expect(mockCaptureException).toHaveBeenCalledWith(
        expect.anything(),
        undefined,
        { url: '/api/data', method: 'POST', status_code: 500 },
      );
    });
  });
});
