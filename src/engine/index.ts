// Public surface of the Decision Engine.
// Consumers: src/server/recommendation/* (Plan 03), tests.

export { recommend } from './recommend';
export type { RecommendDeps } from './recommend';

export {
  EngineError,
  EngineNoCandidatesError,
  LlmInvalidJsonError,
  LlmRefusalError,
  EngineTimeoutError,
  EngineParseError,
  EngineSafetyError,
  ok,
  fail,
} from './errors';
export type { EngineResult } from './errors';

export { scoreCandidate, SCORE_WEIGHTS } from './score';
export { filterCandidates } from './filter';
export type { FilterResult } from './filter';

export { PROMPTS_VERSION } from './prompt';

// Re-export engine types for consumers that only import from @/engine.
export type {
  RecommendationContext,
  RecommendationResult,
  MealCandidate,
  LlmClient,
  Logger,
} from './types';
