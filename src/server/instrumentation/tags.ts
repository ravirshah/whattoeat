import { ENGINE_VERSION, PROMPTS_VERSION } from '@/lib/version';
/**
 * Sentry tag helpers for the WhatToEat application.
 *
 * All events should carry: userId, track, engineVersion, promptsVersion.
 * Per-route tags (userId, track) are set by the calling code; global version
 * tags are set once at boot via setGlobalTags() and inherit to all events.
 */
import * as Sentry from '@sentry/nextjs';

/**
 * Call once at server startup (e.g., from src/instrumentation.ts register())
 * to stamp every outgoing Sentry event with version metadata.
 */
export function setGlobalSentryTags(): void {
  Sentry.setTag('engineVersion', ENGINE_VERSION);
  Sentry.setTag('promptsVersion', PROMPTS_VERSION);
}

export interface RequestTags {
  userId?: string | null;
  track?: string;
}

/**
 * Apply per-request tags to a Sentry scope. Call inside withScope().
 */
export function applyRequestTags(scope: Sentry.Scope, tags: RequestTags): void {
  if (tags.userId) scope.setTag('userId', tags.userId);
  if (tags.track) scope.setTag('track', tags.track);
}
