import type { TokenUsage } from '@/contracts/zod';
import type { LlmClient, LlmGenerateArgs, LlmGenerateResult } from '@/engine/ports/llm';
import {
  type GenerateContentResult,
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from '@google/generative-ai';
import type { ZodSchema } from 'zod';
import { zodToGeminiSchema } from './gemini-schema';
import { LruCache } from './lru-cache';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Fallback chains: each tier walks a list of models. On a 429 (per-day or
// per-minute quota), we try the next model in the chain. 3.1 is the newest
// generation and currently has the most generous free-tier headroom; 2.5-pro
// is the strongest legacy model and still has free-tier quota for low volume.
const CHEAP_FALLBACK_CHAIN = [
  'gemini-3.1-flash-lite-preview',
  'gemini-3-flash-preview',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
];
const QUALITY_FALLBACK_CHAIN = [
  'gemini-3.1-flash-lite-preview',
  'gemini-3-flash-preview',
  'gemini-2.5-pro',
  'gemini-2.5-flash',
];
const DEFAULT_TIMEOUT_MS = 30_000;
const CACHE_CAPACITY = 50;

function dedup(arr: string[]): string[] {
  return Array.from(new Set(arr.filter(Boolean)));
}

/**
 * Returns true when the error is the kind that should rotate to the next model:
 *   429 — quota / rate-limit exhausted on this model
 *   503 — model temporarily unavailable
 *   500 — model-side internal error (often transient and model-specific)
 * Other failures (timeout, refusal, schema, 4xx other than 429) bubble up.
 */
function isModelRotationError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { status?: number; message?: unknown };
  if (e.status === 429 || e.status === 503 || e.status === 500) return true;
  if (typeof e.message === 'string') {
    if (/\b(429|503|500)\b|quota|Too Many Requests|Service Unavailable|Internal/i.test(e.message)) {
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

/** Thrown when the Gemini SDK call times out. `isTimeout` is true for engine mapping. */
export class GeminiTimeoutError extends Error {
  readonly isTimeout = true as const;
  constructor(timeoutMs: number) {
    super(`Gemini request timed out after ${timeoutMs}ms`);
    this.name = 'GeminiTimeoutError';
  }
}

/** Thrown when Gemini returns SAFETY or RECITATION finish reason. */
export class GeminiRefusalError extends Error {
  constructor(finishReason: string) {
    super(`LLM refusal: Gemini blocked response (finishReason=${finishReason})`);
    this.name = 'GeminiRefusalError';
  }
}

/** Thrown when Gemini response text fails Zod schema validation after retry. */
export class GeminiSchemaError extends Error {
  constructor(zodMessage: string) {
    super(`Schema validation failed: ${zodMessage}`);
    this.name = 'GeminiSchemaError';
  }
}

// ---------------------------------------------------------------------------
// Safety settings (permissive — we rely on engine allergen filter instead)
// ---------------------------------------------------------------------------

const SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
];

// ---------------------------------------------------------------------------
// GeminiLlmClient
// ---------------------------------------------------------------------------

export class GeminiLlmClient implements LlmClient {
  private readonly genAI: GoogleGenerativeAI;
  private readonly cheapChain: string[];
  private readonly qualityChain: string[];
  private readonly cache = new LruCache<LlmGenerateResult<unknown>>(CACHE_CAPACITY);

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY environment variable is not set. ' +
          'Set it in .env.local (local) or Vercel Project Settings (prod).',
      );
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    // env overrides become the primary model; fallback chain follows.
    const cheapPrimary = process.env.GEMINI_MODEL_CHEAP;
    const qualityPrimary = process.env.GEMINI_MODEL_QUALITY;
    this.cheapChain = dedup([...(cheapPrimary ? [cheapPrimary] : []), ...CHEAP_FALLBACK_CHAIN]);
    this.qualityChain = dedup([
      ...(qualityPrimary ? [qualityPrimary] : []),
      ...QUALITY_FALLBACK_CHAIN,
    ]);
  }

  async generateStructured<T>(args: LlmGenerateArgs<T>): Promise<LlmGenerateResult<T>> {
    // Check cache first (keyed on cacheKey when provided)
    if (args.cacheKey) {
      const cached = this.cache.get(args.cacheKey) as LlmGenerateResult<T> | undefined;
      if (cached) return cached;
    }

    const result = await this.callWithRetry(args);

    if (args.cacheKey) {
      this.cache.set(args.cacheKey, result as LlmGenerateResult<unknown>);
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // Private: call with one retry on schema-validation failure
  // ---------------------------------------------------------------------------

  private async callWithRetry<T>(args: LlmGenerateArgs<T>): Promise<LlmGenerateResult<T>> {
    try {
      return await this.callOnce(args);
    } catch (err) {
      // Only retry on schema validation failures (not timeouts or refusals)
      if (err instanceof GeminiSchemaError) {
        const retryArgs: LlmGenerateArgs<T> = {
          ...args,
          user: `${args.user}\n\n[RETRY] Your previous response failed schema validation: ${err.message}. Please fix and respond with valid JSON only.`,
        };
        return await this.callOnce(retryArgs);
      }
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // Private: walk the fallback chain, advancing on transient model-side failures
  // (429 quota, 503 unavailable, 500 internal). Non-rotation errors (timeout,
  // refusal, schema) bubble up immediately so the schema-retry path still runs.
  // ---------------------------------------------------------------------------

  private async callOnce<T>(args: LlmGenerateArgs<T>): Promise<LlmGenerateResult<T>> {
    const chain = args.modelHint === 'strong' ? this.qualityChain : this.cheapChain;
    let lastRotationError: unknown;
    for (const modelName of chain) {
      try {
        return await this.callWithModel(args, modelName);
      } catch (err) {
        if (isModelRotationError(err)) {
          lastRotationError = err;
          continue;
        }
        throw err;
      }
    }
    // Whole chain exhausted by transient errors.
    throw lastRotationError ?? new Error('All Gemini models exhausted with no error captured');
  }

  // ---------------------------------------------------------------------------
  // Private: single SDK call with timeout + error mapping
  // ---------------------------------------------------------------------------

  private async callWithModel<T>(
    args: LlmGenerateArgs<T>,
    modelName: string,
  ): Promise<LlmGenerateResult<T>> {
    const timeoutMs = args.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    const model = this.genAI.getGenerativeModel({
      model: modelName,
      safetySettings: SAFETY_SETTINGS,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: zodToGeminiSchema(args.schema as ZodSchema<unknown>) as never,
      },
    });

    // Build the prompt parts (system + user combined via content array)
    const contents = [
      {
        role: 'user' as const,
        parts: [{ text: `${args.system}\n\n---\n\n${args.user}` }],
      },
    ];

    // Race the SDK call against a timeout promise
    const timeoutPromise: Promise<never> = new Promise((_, reject) => {
      setTimeout(() => reject(new GeminiTimeoutError(timeoutMs)), timeoutMs);
    });

    let raw: GenerateContentResult;
    try {
      raw = await Promise.race([model.generateContent({ contents }), timeoutPromise]);
    } catch (err: unknown) {
      if (err instanceof GeminiTimeoutError) throw err;
      throw err;
    }

    // Check finish reason for safety/refusal blocks
    const candidate = raw.response.candidates?.[0];
    if (!candidate) {
      throw new GeminiRefusalError('NO_CANDIDATES');
    }
    const finishReason = candidate.finishReason;
    if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
      throw new GeminiRefusalError(String(finishReason));
    }

    // Extract text and parse JSON
    const text = candidate.content.parts[0]?.text ?? '';
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new GeminiSchemaError(`Response was not valid JSON: ${text.slice(0, 200)}`);
    }

    // Validate against Zod schema
    const zodResult = (args.schema as ZodSchema<unknown>).safeParse(parsed);
    if (!zodResult.success) {
      throw new GeminiSchemaError(zodResult.error.message);
    }

    // Extract token usage from response metadata
    const usage = raw.response.usageMetadata;
    const tokens: TokenUsage = {
      prompt: usage?.promptTokenCount ?? 0,
      completion: usage?.candidatesTokenCount ?? 0,
    };

    return {
      value: zodResult.data as T,
      tokens,
      modelUsed: modelName,
    };
  }
}
