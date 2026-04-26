import { ENGINE_VERSION, PROMPTS_VERSION } from '@/lib/version';
/**
 * withInstrumentation — wraps a Server Action (or any async function) with:
 *   - Sentry scope tags (action name, userId, engine/prompts version, track)
 *   - Latency measurement
 *   - Automatic captureException on error (then re-throws)
 *
 * Usage:
 *   const addPantryItem = withInstrumentation(
 *     'pantry.add',
 *     _addPantryItem,
 *     { userId }
 *   );
 *
 * The error boundary on the calling route still fires — re-throwing is
 * intentional. Sentry captures context before Next.js swallows the trace.
 */
import * as Sentry from '@sentry/nextjs';
import { type RequestTags, applyRequestTags } from './tags';

// biome-ignore lint/suspicious/noExplicitAny: generic async fn wrapper requires any
type AnyAsyncFn = (...args: any[]) => Promise<any>;

export function withInstrumentation<T extends AnyAsyncFn>(
  actionName: string,
  fn: T,
  tags: RequestTags = {},
): T {
  const wrapped = async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    const start = performance.now();
    try {
      const result = await fn(...args);
      const latencyMs = Math.round(performance.now() - start);
      Sentry.withScope((scope) => {
        scope.setTag('action', actionName);
        scope.setTag('engineVersion', ENGINE_VERSION);
        scope.setTag('promptsVersion', PROMPTS_VERSION);
        scope.setExtra('latencyMs', latencyMs);
        applyRequestTags(scope, tags);
      });
      return result;
    } catch (err) {
      const latencyMs = Math.round(performance.now() - start);
      Sentry.withScope((scope) => {
        scope.setTag('action', actionName);
        scope.setTag('engineVersion', ENGINE_VERSION);
        scope.setTag('promptsVersion', PROMPTS_VERSION);
        scope.setExtra('latencyMs', latencyMs);
        applyRequestTags(scope, tags);
      });
      Sentry.captureException(err);
      throw err;
    }
  };
  return wrapped as T;
}
