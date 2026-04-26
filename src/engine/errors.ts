import { EngineError, EngineParseError, EngineSafetyError, EngineTimeoutError } from './types';

// Re-export base error classes
export { EngineError, EngineParseError, EngineSafetyError, EngineTimeoutError };

// ---------------------------------------------------------------------------
// Discriminated-union result wrapper
// ---------------------------------------------------------------------------

export type EngineResult<T> = { ok: true; value: T } | { ok: false; error: EngineError };

export function ok<T>(value: T): EngineResult<T> {
  return { ok: true, value };
}

export function fail<T>(error: EngineError): EngineResult<T> {
  return { ok: false, error };
}

// ---------------------------------------------------------------------------
// LLM-level errors (failures from the LLM call layer)
// ---------------------------------------------------------------------------

/** LLM returned content that failed Zod schema validation after retry. */
export class LlmInvalidJsonError extends EngineParseError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'LlmInvalidJsonError';
  }
}

/** LLM refused to answer (safety filter, content policy, etc.). */
export class LlmRefusalError extends EngineParseError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'LlmRefusalError';
  }
}

// ---------------------------------------------------------------------------
// Engine-level errors (failures in orchestration/filter/score)
// ---------------------------------------------------------------------------

/** All candidates were filtered out — nothing safe to return. */
export class EngineNoCandidatesError extends EngineSafetyError {
  constructor(message = 'All candidates were filtered out.', cause?: unknown) {
    super(message, cause);
    this.name = 'EngineNoCandidatesError';
  }
}
