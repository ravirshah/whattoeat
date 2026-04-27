import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { _resetKeyCacheForTesting, openCredentials, sealCredentials } from '../credentials';

const Schema = z.object({ access: z.string(), refresh: z.string(), expires_at: z.string() });

const VALID_KEY = Buffer.alloc(32, 7).toString('base64');
const OTHER_KEY = Buffer.alloc(32, 9).toString('base64');

describe('sealCredentials / openCredentials', () => {
  let prevKey: string | undefined;
  beforeEach(() => {
    prevKey = process.env.INTEGRATIONS_ENC_KEY;
    process.env.INTEGRATIONS_ENC_KEY = VALID_KEY;
    _resetKeyCacheForTesting();
  });
  afterEach(() => {
    if (prevKey === undefined) Reflect.deleteProperty(process.env, 'INTEGRATIONS_ENC_KEY');
    else process.env.INTEGRATIONS_ENC_KEY = prevKey;
    _resetKeyCacheForTesting();
  });

  it('round-trips a credential payload', () => {
    const payload = { access: 'a-token', refresh: 'r-token', expires_at: '2026-04-26T00:00:00Z' };
    const sealed = sealCredentials(payload);
    expect(sealed).toBeInstanceOf(Buffer);
    expect(sealed.length).toBeGreaterThan(28); // IV(12) + tag(16) + payload
    const opened = openCredentials(sealed, Schema);
    expect(opened).toEqual(payload);
  });

  it('produces a different ciphertext on each call (random IV)', () => {
    const payload = { access: 'a', refresh: 'r', expires_at: 'z' };
    const a = sealCredentials(payload);
    const b = sealCredentials(payload);
    expect(a.equals(b)).toBe(false);
  });

  it('rejects a tampered ciphertext', () => {
    const sealed = sealCredentials({ access: 'a', refresh: 'r', expires_at: 'z' });
    const tampered = Buffer.from(sealed);
    tampered[tampered.length - 1] ^= 0xff;
    expect(() => openCredentials(tampered, Schema)).toThrow();
  });

  it('rejects when opened with the wrong key', () => {
    const sealed = sealCredentials({ access: 'a', refresh: 'r', expires_at: 'z' });
    process.env.INTEGRATIONS_ENC_KEY = OTHER_KEY;
    _resetKeyCacheForTesting();
    expect(() => openCredentials(sealed, Schema)).toThrow();
  });

  it('rejects payloads that fail schema validation', () => {
    const sealed = sealCredentials({ access: 'a' });
    expect(() => openCredentials(sealed, Schema)).toThrow();
  });

  it('throws a clear error when the key env var is missing', () => {
    Reflect.deleteProperty(process.env, 'INTEGRATIONS_ENC_KEY');
    _resetKeyCacheForTesting();
    expect(() => sealCredentials({ access: 'a', refresh: 'r', expires_at: 'z' })).toThrow(
      /INTEGRATIONS_ENC_KEY/,
    );
  });

  it('throws when the key is not 32 decoded bytes', () => {
    process.env.INTEGRATIONS_ENC_KEY = Buffer.alloc(16, 1).toString('base64');
    _resetKeyCacheForTesting();
    expect(() => sealCredentials({ access: 'a', refresh: 'r', expires_at: 'z' })).toThrow(
      /32 bytes/,
    );
  });
});
