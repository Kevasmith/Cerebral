import { encryptedTransformer } from './column-encryption';

const VALID_KEY = 'a'.repeat(64); // 64 valid hex chars → 32 bytes

describe('encryptedTransformer', () => {
  beforeEach(() => {
    process.env.ENCRYPTION_KEY = VALID_KEY;
  });

  afterEach(() => {
    delete process.env.ENCRYPTION_KEY;
  });

  describe('to (encrypt)', () => {
    it('returns null for null input', () => {
      expect(encryptedTransformer.to(null)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(encryptedTransformer.to(undefined)).toBeNull();
    });

    it('produces a ciphertext with the enc:v1: prefix', () => {
      const result = encryptedTransformer.to('secret-token');
      expect(result).toMatch(/^enc:v1:/);
    });

    it('does not return the plaintext value', () => {
      const result = encryptedTransformer.to('my-access-token');
      expect(result).not.toContain('my-access-token');
    });

    it('produces a different ciphertext each call due to a random IV', () => {
      const first  = encryptedTransformer.to('same-value');
      const second = encryptedTransformer.to('same-value');
      expect(first).not.toBe(second);
    });

    it('throws when ENCRYPTION_KEY is not set', () => {
      delete process.env.ENCRYPTION_KEY;
      expect(() => encryptedTransformer.to('value')).toThrow('ENCRYPTION_KEY is not set');
    });

    it('throws when ENCRYPTION_KEY is the wrong length', () => {
      process.env.ENCRYPTION_KEY = 'tooshort';
      expect(() => encryptedTransformer.to('value')).toThrow(
        'ENCRYPTION_KEY must be 64 hex chars (32 bytes)',
      );
    });
  });

  describe('from (decrypt)', () => {
    it('returns null for null input', () => {
      expect(encryptedTransformer.from(null)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(encryptedTransformer.from(undefined)).toBeNull();
    });

    it('decrypts a value encrypted by the to transformer', () => {
      const plaintext = 'access-token-12345';
      const ciphertext = encryptedTransformer.to(plaintext) as string;
      expect(encryptedTransformer.from(ciphertext)).toBe(plaintext);
    });

    it('passes through a legacy unencrypted value without a prefix', () => {
      const legacy = 'some-plain-token-from-old-row';
      expect(encryptedTransformer.from(legacy)).toBe(legacy);
    });

    it('returns the raw value (does not throw) when decryption fails', () => {
      // Tampered ciphertext — wrong auth tag — should not throw
      const tampered = 'enc:v1:aabbcc:ddeeff:001122';
      expect(() => encryptedTransformer.from(tampered)).not.toThrow();
    });
  });

  describe('roundtrip', () => {
    it.each([
      'short',
      'a longer string with spaces and punctuation!',
      '{"json":"payload","nested":{"key":true}}',
      'unicode: 日本語 émojis 🔑',
    ])('roundtrips %s', (original) => {
      const encrypted = encryptedTransformer.to(original) as string;
      expect(encryptedTransformer.from(encrypted)).toBe(original);
    });
  });
});
