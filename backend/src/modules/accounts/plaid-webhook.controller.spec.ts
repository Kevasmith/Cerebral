import { UnauthorizedException } from '@nestjs/common';
import { PlaidWebhookController } from './plaid-webhook.controller';

const mockPlaid    = { verifyWebhook: jest.fn() };
const mockAccounts = { handlePlaidWebhook: jest.fn() };

function makeController() {
  return new PlaidWebhookController(mockAccounts as any, mockPlaid as any);
}

function makeReq(body: string): any {
  return { rawBody: Buffer.from(body, 'utf8') };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('PlaidWebhookController', () => {
  let controller: PlaidWebhookController;

  beforeEach(() => {
    controller = makeController();
    jest.clearAllMocks();
    mockAccounts.handlePlaidWebhook.mockResolvedValue(undefined);
  });

  // ── JWT verification gate ──────────────────────────────────────────────────

  describe('JWT verification gate', () => {
    it('throws UnauthorizedException when verifyWebhook returns false', async () => {
      mockPlaid.verifyWebhook.mockResolvedValue(false);

      await expect(
        controller.plaidWebhook('bad-jwt', makeReq('{}')),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('passes rawBody and jwt to verifyWebhook', async () => {
      mockPlaid.verifyWebhook.mockResolvedValue(false);
      const body = '{"webhook_type":"TRANSACTIONS"}';

      await expect(
        controller.plaidWebhook('my-jwt', makeReq(body)),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPlaid.verifyWebhook).toHaveBeenCalledWith(body, 'my-jwt');
    });

    it('uses empty string when req.rawBody is undefined', async () => {
      mockPlaid.verifyWebhook.mockResolvedValue(false);

      await expect(
        controller.plaidWebhook('jwt', { rawBody: undefined } as any),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPlaid.verifyWebhook).toHaveBeenCalledWith('', 'jwt');
    });
  });

  // ── JSON parsing gate ──────────────────────────────────────────────────────

  describe('JSON parsing gate', () => {
    it('throws UnauthorizedException for malformed JSON after valid JWT', async () => {
      mockPlaid.verifyWebhook.mockResolvedValue(true);

      await expect(
        controller.plaidWebhook('valid-jwt', makeReq('not-json')),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('does not dispatch the handler when JSON is invalid', async () => {
      mockPlaid.verifyWebhook.mockResolvedValue(true);

      await expect(
        controller.plaidWebhook('valid-jwt', makeReq('{bad}')),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockAccounts.handlePlaidWebhook).not.toHaveBeenCalled();
    });
  });

  // ── happy path ─────────────────────────────────────────────────────────────

  describe('happy path', () => {
    it('returns { ok: true } for a valid request', async () => {
      mockPlaid.verifyWebhook.mockResolvedValue(true);
      const body = JSON.stringify({ webhook_type: 'TRANSACTIONS' });

      const result = await controller.plaidWebhook('valid-jwt', makeReq(body));

      expect(result).toEqual({ ok: true });
    });

    it('dispatches handlePlaidWebhook with the parsed payload', async () => {
      mockPlaid.verifyWebhook.mockResolvedValue(true);
      const payload = { webhook_type: 'TRANSACTIONS', item_id: 'item-1' };
      const body = JSON.stringify(payload);

      await controller.plaidWebhook('valid-jwt', makeReq(body));

      expect(mockAccounts.handlePlaidWebhook).toHaveBeenCalledWith(payload);
    });

    it('returns before the handler resolves (fire-and-forget dispatch)', async () => {
      mockPlaid.verifyWebhook.mockResolvedValue(true);
      let handlerResolve!: () => void;
      let handlerStarted = false;
      mockAccounts.handlePlaidWebhook.mockImplementation(
        () => new Promise<void>(resolve => { handlerStarted = true; handlerResolve = resolve; }),
      );
      const body = JSON.stringify({ webhook_type: 'TRANSACTIONS' });

      const result = await controller.plaidWebhook('valid-jwt', makeReq(body));

      // Controller resolved even though the handler promise is still pending.
      expect(result).toEqual({ ok: true });
      expect(handlerStarted).toBe(true);

      // Clean up the hanging promise so Jest doesn't warn.
      handlerResolve();
    });

    it('still returns { ok: true } even when the handler eventually rejects', async () => {
      mockPlaid.verifyWebhook.mockResolvedValue(true);
      mockAccounts.handlePlaidWebhook.mockRejectedValue(new Error('DB down'));
      const body = JSON.stringify({ webhook_type: 'TRANSACTIONS' });

      await expect(
        controller.plaidWebhook('valid-jwt', makeReq(body)),
      ).resolves.toEqual({ ok: true });
    });
  });
});
