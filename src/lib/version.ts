/**
 * Version constants surfaced to Sentry and structured logs.
 *
 * engineVersion  = package.json "version" field (set by CI on release).
 * promptsVersion = the PROMPTS_VERSION constant from the engine (re-exported
 *                  here so non-engine code can read it without importing the
 *                  engine barrel directly).
 *
 * If Track 2 (engine core) is not yet merged, promptsVersion falls back to
 * the placeholder below. Replace once Track 2 lands.
 */

// Injected by the Next.js build via next.config.ts `env` block so it is
// available on both server and client (no fs access at runtime).
export const ENGINE_VERSION: string = process.env.NEXT_PUBLIC_ENGINE_VERSION ?? '2.0.0';

// Re-export from engine once Track 2 is merged; keep this fallback until then.
// <!-- TODO: replace with: export { PROMPTS_VERSION } from '@/engine/index' -->
export const PROMPTS_VERSION: string = process.env.NEXT_PUBLIC_PROMPTS_VERSION ?? 'unset';
