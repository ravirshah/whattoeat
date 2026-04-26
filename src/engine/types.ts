export type {
  RecommendationContext,
  RecommendationRequest,
  RecommendationResult,
  MealCandidate,
  HealthSignals,
  Profile,
  PantryItem,
  Checkin,
  Macros,
  Ingredient,
  Step,
  TokenUsage,
} from '@/contracts/zod';

export type { LlmClient, LlmGenerateArgs, LlmGenerateResult } from './ports/llm';
export type { SignalProvider, DateRange } from './ports/signal-provider';
export type { Logger } from './ports/logger';

/** Engine error subclasses — concrete classes added in Plan 02. */
export class EngineError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'EngineError';
  }
}
export class EngineParseError extends EngineError {
  constructor(message: string, cause?: unknown) { super(message, cause); this.name = 'EngineParseError'; }
}
export class EngineSafetyError extends EngineError {
  constructor(message: string, cause?: unknown) { super(message, cause); this.name = 'EngineSafetyError'; }
}
export class EngineTimeoutError extends EngineError {
  constructor(message: string, cause?: unknown) { super(message, cause); this.name = 'EngineTimeoutError'; }
}
