import type { TokenUsage } from '@/contracts/zod';
import type { LlmClient, LlmGenerateArgs, LlmGenerateResult } from '@/engine/ports/llm';
import {
  type GenerateContentResult,
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from '@google/generative-ai';
import type { ZodSchema } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { LruCache } from './lru-cache';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_CHEAP_MODEL = 'gemini-1.5-flash';
const DEFAULT_QUALITY_MODEL = 'gemini-1.5-pro';
const DEFAULT_TIMEOUT_MS = 30_000;
const CACHE_CAPACITY = 50;

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
  private readonly cheapModel: string;
  private readonly qualityModel: string;
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
    this.cheapModel = process.env.GEMINI_MODEL_CHEAP ?? DEFAULT_CHEAP_MODEL;
    this.qualityModel = process.env.GEMINI_MODEL_QUALITY ?? DEFAULT_QUALITY_MODEL;
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
  // Private: single SDK call with timeout + error mapping
  // ---------------------------------------------------------------------------

  private async callOnce<T>(args: LlmGenerateArgs<T>): Promise<LlmGenerateResult<T>> {
    const modelName = args.modelHint === 'strong' ? this.qualityModel : this.cheapModel;
    const timeoutMs = args.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    const model = this.genAI.getGenerativeModel({
      model: modelName,
      safetySettings: SAFETY_SETTINGS,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: zodToJsonSchema(args.schema as ZodSchema<unknown>) as never,
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
