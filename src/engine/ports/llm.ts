import type { TokenUsage } from '@/contracts/zod';
import type { ZodSchema } from 'zod';

export interface LlmGenerateArgs<T> {
  system: string;
  user: string;
  schema: ZodSchema<T>;
  cacheKey?: string;
  /** Caller may suggest a model tier; the adapter decides whether to honor it. */
  modelHint?: 'cheap' | 'strong';
  /** Hard timeout in ms. */
  timeoutMs?: number;
}

export interface LlmGenerateResult<T> {
  value: T;
  tokens: TokenUsage;
  modelUsed: string;
}

export interface LlmClient {
  generateStructured<T>(args: LlmGenerateArgs<T>): Promise<LlmGenerateResult<T>>;
}
