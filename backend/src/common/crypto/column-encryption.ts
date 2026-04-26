import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { ValueTransformer } from 'typeorm';

const ALGO = 'aes-256-gcm';
const PREFIX = 'enc:v1:';

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex) throw new Error('ENCRYPTION_KEY is not set');
  if (hex.length !== 64) throw new Error('ENCRYPTION_KEY must be 64 hex chars (32 bytes)');
  return Buffer.from(hex, 'hex');
}

function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const data = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${data.toString('hex')}`;
}

function decrypt(value: string): string {
  if (!value.startsWith(PREFIX)) {
    // Unencrypted legacy row — return as-is for graceful migration
    return value;
  }
  const [ivHex, tagHex, dataHex] = value.slice(PREFIX.length).split(':');
  const key = getKey();
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]).toString('utf8');
}

export const encryptedTransformer: ValueTransformer = {
  to: (value: string | null | undefined): string | null => {
    if (value == null) return null;
    return encrypt(value);
  },
  from: (value: string | null | undefined): string | null => {
    if (value == null) return null;
    try {
      return decrypt(value);
    } catch {
      return value;
    }
  },
};
