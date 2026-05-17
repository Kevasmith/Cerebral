import * as crypto from 'crypto';
import { PlaidService } from './plaid.service';

// ── Real P-256 key pair — generated once for the entire file ─────────────────
// verifyWebhook uses crypto.verify with dsaEncoding:'ieee-p1363', so we need
// a genuine EC key to produce valid test signatures.

const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
  namedCurve: 'P-256',
});
const exportedJwk = publicKey.export({ format: 'jwk' }) as {
  kty: string; crv: string; x: string; y: string;
};

// ── helpers ───────────────────────────────────────────────────────────────────

function b64url(buf: Buffer): string {
  return buf.toString('base64url');
}

function bodyHash(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

interface JwtOpts {
  alg?:      string;
  kid?:      string;
  iat?:      number;
  bodyHash?: string;
  /** Replace the signature with this arbitrary value (to test invalid-sig). */
  fakeSignature?: string;
}

function buildJwt(rawBody: string, opts: JwtOpts = {}): string {
  const header = { alg: opts.alg ?? 'ES256', kid: opts.kid ?? 'test-kid' };
  const claims = {
    request_body_sha256: opts.bodyHash ?? bodyHash(rawBody),
    iat: opts.iat ?? Math.floor(Date.now() / 1000),
  };

  const h = b64url(Buffer.from(JSON.stringify(header)));
  const p = b64url(Buffer.from(JSON.stringify(claims)));
  const sigBuf = crypto.sign(
    'sha256',
    Buffer.from(`${h}.${p}`),
    { key: privateKey, dsaEncoding: 'ieee-p1363' },
  );
  const sig = opts.fakeSignature ?? b64url(sigBuf);
  return `${h}.${p}.${sig}`;
}

// ── shared mock client ────────────────────────────────────────────────────────

const mockClient = {
  webhookVerificationKeyGet: jest.fn(),
  linkTokenCreate:           jest.fn(),
  itemPublicTokenExchange:   jest.fn(),
  accountsGet:               jest.fn(),
  transactionsSync:          jest.fn(),
};

const VALID_JWK_RESPONSE = {
  data: {
    key: { kty: exportedJwk.kty, crv: exportedJwk.crv, x: exportedJwk.x, y: exportedJwk.y },
  },
};

// ── service factories ─────────────────────────────────────────────────────────

function makeService(): PlaidService {
  const cfg = {
    get: jest.fn((key: string) => {
      if (key === 'PLAID_CLIENT_ID') return 'test-client-id';
      if (key === 'PLAID_SECRET')    return 'test-secret';
      return undefined;
    }),
  };
  const svc = new PlaidService(cfg as any);
  (svc as any).client = mockClient;
  return svc;
}

function makeServiceNoCredentials(): PlaidService {
  const cfg = { get: jest.fn().mockReturnValue('') };
  const svc = new PlaidService(cfg as any);
  (svc as any).client = mockClient;
  return svc;
}

// ─────────────────────────────────────────────────────────────────────────────

describe('PlaidService.verifyWebhook', () => {
  let service: PlaidService;

  beforeEach(() => {
    service = makeService();
    jest.clearAllMocks();
    // Default: resolve with the real public key's JWK
    mockClient.webhookVerificationKeyGet.mockResolvedValue(VALID_JWK_RESPONSE);
    // Clear JWK cache between tests
    (service as any).jwkCache.clear();
  });

  // ── early-exit guards ──────────────────────────────────────────────────────

  describe('early-exit guards', () => {
    it('returns false when jwt is an empty string', async () => {
      expect(await service.verifyWebhook('{}', '')).toBe(false);
    });

    it('returns false when jwt is falsy (undefined cast to empty)', async () => {
      expect(await service.verifyWebhook('{}', undefined as any)).toBe(false);
    });

    it('returns false when Plaid credentials are not configured', async () => {
      const noCredSvc = makeServiceNoCredentials();
      const jwt = buildJwt('{}');
      expect(await noCredSvc.verifyWebhook('{}', jwt)).toBe(false);
    });

    it('returns false when jwt does not have exactly 3 dot-separated parts', async () => {
      expect(await service.verifyWebhook('{}', 'only.two')).toBe(false);
      expect(await service.verifyWebhook('{}', 'a.b.c.d')).toBe(false);
    });
  });

  // ── JWT parsing ────────────────────────────────────────────────────────────

  describe('JWT header / claims parsing', () => {
    it('returns false when the header is not valid base64/JSON', async () => {
      expect(await service.verifyWebhook('{}', '!!!.payload.sig')).toBe(false);
    });

    it('returns false when alg is not ES256', async () => {
      const jwt = buildJwt('{}', { alg: 'RS256' });
      expect(await service.verifyWebhook('{}', jwt)).toBe(false);
    });

    it('returns false when the header has no kid', async () => {
      // Build JWT manually with no kid field
      const header = { alg: 'ES256' }; // no kid
      const claims = { request_body_sha256: bodyHash('{}'), iat: Math.floor(Date.now() / 1000) };
      const h = b64url(Buffer.from(JSON.stringify(header)));
      const p = b64url(Buffer.from(JSON.stringify(claims)));
      const sigBuf = crypto.sign('sha256', Buffer.from(`${h}.${p}`), { key: privateKey, dsaEncoding: 'ieee-p1363' });
      const jwt = `${h}.${p}.${b64url(sigBuf)}`;

      expect(await service.verifyWebhook('{}', jwt)).toBe(false);
    });
  });

  // ── JWK fetching & caching ─────────────────────────────────────────────────

  describe('JWK fetching and caching', () => {
    it('returns false when the JWK fetch fails', async () => {
      mockClient.webhookVerificationKeyGet.mockRejectedValue(new Error('network'));
      const jwt = buildJwt('{}');

      expect(await service.verifyWebhook('{}', jwt)).toBe(false);
    });

    it('fetches the JWK on the first call (cache miss)', async () => {
      const body = '{"webhook":"test"}';
      const jwt  = buildJwt(body);

      await service.verifyWebhook(body, jwt);

      expect(mockClient.webhookVerificationKeyGet).toHaveBeenCalledWith({ key_id: 'test-kid' });
    });

    it('does not re-fetch on a second call with the same kid (cache hit)', async () => {
      const body = '{"webhook":"test"}';
      const jwt  = buildJwt(body);

      await service.verifyWebhook(body, jwt);
      await service.verifyWebhook(body, buildJwt(body));

      expect(mockClient.webhookVerificationKeyGet).toHaveBeenCalledTimes(1);
    });

    it('re-fetches when the cached JWK has expired (> 24h old)', async () => {
      const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
      const body = '{"webhook":"test"}';
      // Pre-seed an expired cache entry
      (service as any).jwkCache.set('test-kid', {
        key:       { kty: exportedJwk.kty, crv: exportedJwk.crv, x: exportedJwk.x, y: exportedJwk.y, alg: 'ES256' },
        fetchedAt: Date.now() - CACHE_TTL_MS - 1000,
      });

      await service.verifyWebhook(body, buildJwt(body));

      expect(mockClient.webhookVerificationKeyGet).toHaveBeenCalledTimes(1);
    });
  });

  // ── signature verification ─────────────────────────────────────────────────

  describe('signature verification', () => {
    it('returns true for a correctly signed webhook', async () => {
      const body = '{"webhook_type":"TRANSACTIONS","item_id":"item-1"}';
      const jwt  = buildJwt(body);

      expect(await service.verifyWebhook(body, jwt)).toBe(true);
    });

    it('returns false when the signature is invalid (tampered)', async () => {
      const body = '{"webhook_type":"TRANSACTIONS"}';
      const jwt  = buildJwt(body, { fakeSignature: b64url(Buffer.alloc(64)) });

      expect(await service.verifyWebhook(body, jwt)).toBe(false);
    });
  });

  // ── body hash check ────────────────────────────────────────────────────────

  describe('body hash check', () => {
    it('returns false when request_body_sha256 does not match the actual body', async () => {
      const body = '{"webhook_type":"TRANSACTIONS"}';
      const jwt  = buildJwt(body, { bodyHash: bodyHash('totally-different-body') });

      expect(await service.verifyWebhook(body, jwt)).toBe(false);
    });

    it('returns true when the body hash matches exactly', async () => {
      const body = '{"a":1}';
      expect(await service.verifyWebhook(body, buildJwt(body))).toBe(true);
    });
  });

  // ── replay protection ──────────────────────────────────────────────────────

  describe('replay protection', () => {
    const MAX_AGE_S = 5 * 60; // 300 seconds

    it('returns false when the token is older than 5 minutes', async () => {
      const body = '{}';
      const oldIat = Math.floor(Date.now() / 1000) - MAX_AGE_S - 1; // 301 s ago
      const jwt   = buildJwt(body, { iat: oldIat });

      expect(await service.verifyWebhook(body, jwt)).toBe(false);
    });

    it('returns true when the token is exactly at the 5-minute boundary (iat = now - 300)', async () => {
      const body = '{}';
      const iat  = Math.floor(Date.now() / 1000) - MAX_AGE_S; // exactly 300 s ago — not > 300
      const jwt  = buildJwt(body, { iat });

      expect(await service.verifyWebhook(body, jwt)).toBe(true);
    });

    it('returns true when iat is missing (skip the age check — permissive)', async () => {
      const body = '{}';
      // Build JWT payload with no iat field
      const header = { alg: 'ES256', kid: 'test-kid' };
      const claims = { request_body_sha256: bodyHash(body) }; // no iat
      const h = b64url(Buffer.from(JSON.stringify(header)));
      const p = b64url(Buffer.from(JSON.stringify(claims)));
      const sig = crypto.sign('sha256', Buffer.from(`${h}.${p}`), { key: privateKey, dsaEncoding: 'ieee-p1363' });
      const jwt = `${h}.${p}.${b64url(sig)}`;

      expect(await service.verifyWebhook(body, jwt)).toBe(true);
    });
  });
});
