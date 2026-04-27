import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSiteUrl } from '../site-url';

const ENV_KEYS = [
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL',
  'NEXT_PUBLIC_VERCEL_URL',
] as const;

describe('getSiteUrl', () => {
  const original: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of ENV_KEYS) {
      original[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (original[k] === undefined) delete process.env[k];
      else process.env[k] = original[k];
    }
    vi.unstubAllGlobals();
  });

  it('prefers NEXT_PUBLIC_APP_URL when set', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://prod.whattoeat.app';
    process.env.NEXT_PUBLIC_VERCEL_URL = 'preview.vercel.app';
    expect(getSiteUrl()).toBe('https://prod.whattoeat.app');
  });

  it('strips trailing slash from NEXT_PUBLIC_APP_URL', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://prod.whattoeat.app/';
    expect(getSiteUrl()).toBe('https://prod.whattoeat.app');
  });

  it('falls back to NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL and adds https://', () => {
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL = 'whattoeat.vercel.app';
    expect(getSiteUrl()).toBe('https://whattoeat.vercel.app');
  });

  it('falls back to NEXT_PUBLIC_VERCEL_URL when prod url is absent', () => {
    process.env.NEXT_PUBLIC_VERCEL_URL = 'preview-abc.vercel.app';
    expect(getSiteUrl()).toBe('https://preview-abc.vercel.app');
  });

  it('returns localhost on the server when no env is set', () => {
    expect(getSiteUrl()).toBe('http://localhost:3000');
  });

  it('uses window.location.origin in the browser when no env is set', () => {
    vi.stubGlobal('window', { location: { origin: 'http://localhost:5173' } });
    expect(getSiteUrl()).toBe('http://localhost:5173');
  });
});
