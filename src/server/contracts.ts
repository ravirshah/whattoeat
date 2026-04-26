/**
 * Shared types for Server Actions and Route Handlers.
 * Concrete actions live in `src/server/<feature>/*` (added per feature plan).
 */

export type ServerErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'validation_failed'
  | 'rate_limited'
  | 'engine_failed'
  | 'engine_safety'
  | 'engine_timeout'
  | 'internal';

export class ServerError extends Error {
  constructor(
    public readonly code: ServerErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ServerError';
  }
}

export type ApiError = { error: { code: ServerErrorCode; message: string } };

export type ActionResult<T> = { ok: true; value: T } | { ok: false; error: ServerError };
