import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { ZodType } from 'zod';

const ALGORITHM = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN = 32;

let cachedKey: Buffer | null = null;

function loadKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.INTEGRATIONS_ENC_KEY;
  if (!raw) {
    throw new Error(
      'INTEGRATIONS_ENC_KEY is not set. Generate one with `openssl rand -base64 32` and put it in .env.local / Vercel.',
    );
  }
  const buf = Buffer.from(raw, 'base64');
  if (buf.length !== KEY_LEN) {
    throw new Error(
      `INTEGRATIONS_ENC_KEY must decode to ${KEY_LEN} bytes (got ${buf.length}). Use \`openssl rand -base64 32\`.`,
    );
  }
  cachedKey = buf;
  return buf;
}

/**
 * Test-only: reset the cached key. Used by tests that mutate
 * `process.env.INTEGRATIONS_ENC_KEY` between cases.
 */
export function _resetKeyCacheForTesting(): void {
  cachedKey = null;
}

/**
 * Encrypt a JSON-serializable credential blob.
 * Output layout: `[12-byte IV][16-byte auth tag][ciphertext]`.
 */
export function sealCredentials<T>(plaintext: T): Buffer {
  const key = loadKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const json = Buffer.from(JSON.stringify(plaintext), 'utf8');
  const ct = Buffer.concat([cipher.update(json), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]);
}

/**
 * Decrypt and parse a sealed blob, validating the result against `schema`.
 * Throws if the auth tag fails or the schema rejects the payload.
 */
export function openCredentials<T>(blob: Buffer | Uint8Array, schema: ZodType<T>): T {
  const buf = Buffer.isBuffer(blob) ? blob : Buffer.from(blob);
  if (buf.length < IV_LEN + TAG_LEN + 1) {
    throw new Error('Sealed credentials blob is too short to be valid.');
  }
  const key = loadKey();
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ct = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  const parsed = JSON.parse(pt.toString('utf8'));
  return schema.parse(parsed);
}
