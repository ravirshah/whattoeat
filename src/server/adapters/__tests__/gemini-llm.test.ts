import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Mock the entire @google/generative-ai module before importing the adapter.
// ---------------------------------------------------------------------------
const mockGenerateContent = vi.fn();
vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue({
        generateContent: mockGenerateContent,
      }),
    })),
    HarmCategory: {
      HARM_CATEGORY_HATE_SPEECH: 'HARM_CATEGORY_HATE_SPEECH',
      HARM_CATEGORY_SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      HARM_CATEGORY_DANGEROUS_CONTENT: 'HARM_CATEGORY_DANGEROUS_CONTENT',
      HARM_CATEGORY_HARASSMENT: 'HARM_CATEGORY_HARASSMENT',
    },
    HarmBlockThreshold: {
      BLOCK_ONLY_HIGH: 'BLOCK_ONLY_HIGH',
    },
  };
});

// Import after mock is registered.
import { GeminiLlmClient } from '@/server/adapters/gemini-llm';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DishSchema = z.object({
  name: z.string(),
  calories: z.number(),
});

type Dish = z.infer<typeof DishSchema>;

function makeSuccessResponse(json: unknown, modelName = 'gemini-1.5-flash') {
  return {
    response: {
      candidates: [
        {
          content: {
            parts: [{ text: JSON.stringify(json) }],
          },
          finishReason: 'STOP',
        },
      ],
      usageMetadata: {
        promptTokenCount: 120,
        candidatesTokenCount: 40,
      },
      modelVersion: modelName,
    },
  };
}

function makeSafetyBlockResponse() {
  return {
    response: {
      candidates: [
        {
          content: { parts: [{ text: '' }] },
          finishReason: 'SAFETY',
        },
      ],
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 0 },
      modelVersion: 'gemini-1.5-flash',
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GeminiLlmClient', () => {
  let client: GeminiLlmClient;

  beforeEach(() => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key-abc');
    client = new GeminiLlmClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // -------------------------------------------------------------------------
  // Success path
  // -------------------------------------------------------------------------

  it('parses a valid response and returns typed value + token counts', async () => {
    const dish: Dish = { name: 'Grilled Chicken', calories: 350 };
    mockGenerateContent.mockResolvedValueOnce(makeSuccessResponse(dish));

    const result = await client.generateStructured({
      system: 'You are a chef.',
      user: 'Suggest a healthy dish.',
      schema: DishSchema,
    });

    expect(result.value).toEqual(dish);
    expect(result.tokens.prompt).toBe(120);
    expect(result.tokens.completion).toBe(40);
    expect(result.modelUsed).toContain('gemini');
  });

  // -------------------------------------------------------------------------
  // Cache: repeated cacheKey returns cached value without calling SDK again
  // -------------------------------------------------------------------------

  it('returns cached result for a repeated cacheKey without a second SDK call', async () => {
    const dish: Dish = { name: 'Salad', calories: 200 };
    mockGenerateContent.mockResolvedValueOnce(makeSuccessResponse(dish));

    const args = {
      system: 'chef',
      user: 'suggest',
      schema: DishSchema,
      cacheKey: 'unique-key-1',
    };

    const first = await client.generateStructured(args);
    const second = await client.generateStructured(args);

    expect(second.value).toEqual(first.value);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1); // SDK called only once
  });

  it('does not share cache between different cacheKeys', async () => {
    const dish1: Dish = { name: 'Pasta', calories: 500 };
    const dish2: Dish = { name: 'Soup', calories: 150 };
    mockGenerateContent
      .mockResolvedValueOnce(makeSuccessResponse(dish1))
      .mockResolvedValueOnce(makeSuccessResponse(dish2));

    await client.generateStructured({ system: 's', user: 'u', schema: DishSchema, cacheKey: 'k1' });
    await client.generateStructured({ system: 's', user: 'u', schema: DishSchema, cacheKey: 'k2' });

    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  // -------------------------------------------------------------------------
  // Schema parse failure → LlmInvalidJsonError
  // -------------------------------------------------------------------------

  it('throws an error containing "Schema validation" when the response fails Zod parse', async () => {
    // Return JSON that does not match DishSchema (missing "calories")
    // mockGenerateContent will be called twice (initial + retry), both return invalid JSON
    mockGenerateContent.mockResolvedValue(
      makeSuccessResponse({ name: 'Bad Dish' /* no calories */ }),
    );

    await expect(
      client.generateStructured({ system: 's', user: 'u', schema: DishSchema }),
    ).rejects.toThrow(/Schema validation/i);
  });

  // -------------------------------------------------------------------------
  // Timeout → error with isTimeout=true
  // -------------------------------------------------------------------------

  it('throws a timeout error (isTimeout=true) when SDK call exceeds timeoutMs', async () => {
    mockGenerateContent.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 5_000)),
    );

    const promise = client.generateStructured({
      system: 's',
      user: 'u',
      schema: DishSchema,
      timeoutMs: 50, // 50 ms — much shorter than the 5 s mock delay
    });

    await expect(promise).rejects.toMatchObject({ isTimeout: true });
  });

  // -------------------------------------------------------------------------
  // Safety block / refusal → error containing 'refusal'
  // -------------------------------------------------------------------------

  it('throws an error containing "refusal" when the response is blocked for safety', async () => {
    mockGenerateContent.mockResolvedValueOnce(makeSafetyBlockResponse());

    await expect(
      client.generateStructured({ system: 's', user: 'u', schema: DishSchema }),
    ).rejects.toThrow(/refusal/i);
  });

  // -------------------------------------------------------------------------
  // modelHint routing
  // -------------------------------------------------------------------------

  it('uses gemini-3.1-flash-lite-preview as the cheap-tier primary by default', async () => {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const getGenerativeModelSpy = vi.fn().mockReturnValue({
      generateContent: mockGenerateContent.mockResolvedValueOnce(
        makeSuccessResponse({ name: 'Dish', calories: 100 }),
      ),
    });
    vi.mocked(GoogleGenerativeAI).mockImplementationOnce(
      () =>
        ({
          getGenerativeModel: getGenerativeModelSpy,
        }) as never,
    );

    const freshClient = new GeminiLlmClient();
    await freshClient.generateStructured({ system: 's', user: 'u', schema: DishSchema });

    expect(getGenerativeModelSpy).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gemini-3.1-flash-lite-preview' }),
    );
  });

  it('uses gemini-3.1-flash-lite-preview as the quality-tier primary when modelHint is "strong"', async () => {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const getGenerativeModelSpy = vi.fn().mockReturnValue({
      generateContent: mockGenerateContent.mockResolvedValueOnce(
        makeSuccessResponse({ name: 'Dish', calories: 100 }, 'gemini-3.1-flash-lite-preview'),
      ),
    });
    vi.mocked(GoogleGenerativeAI).mockImplementationOnce(
      () =>
        ({
          getGenerativeModel: getGenerativeModelSpy,
        }) as never,
    );

    const freshClient = new GeminiLlmClient();
    await freshClient.generateStructured({
      system: 's',
      user: 'u',
      schema: DishSchema,
      modelHint: 'strong',
    });

    expect(getGenerativeModelSpy).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gemini-3.1-flash-lite-preview' }),
    );
  });

  it('falls through the chain on 429 quota errors and succeeds on the next model', async () => {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const calls: string[] = [];
    const getGenerativeModelSpy = vi.fn().mockImplementation(({ model }: { model: string }) => {
      calls.push(model);
      return {
        generateContent: () => {
          if (calls.length === 1) {
            const err: Error & { status?: number } = Object.assign(
              new Error('Quota exceeded for metric'),
              { status: 429 },
            );
            return Promise.reject(err);
          }
          return Promise.resolve(makeSuccessResponse({ name: 'Dish', calories: 100 }, model));
        },
      };
    });
    vi.mocked(GoogleGenerativeAI).mockImplementationOnce(
      () =>
        ({
          getGenerativeModel: getGenerativeModelSpy,
        }) as never,
    );

    const fb = new GeminiLlmClient();
    const result = await fb.generateStructured({ system: 's', user: 'u', schema: DishSchema });

    expect(calls[0]).toBe('gemini-3.1-flash-lite-preview');
    expect(calls[1]).toBe('gemini-3-flash-preview');
    expect(result.modelUsed).toBe('gemini-3-flash-preview');
  });

  it('respects GEMINI_MODEL_CHEAP env override', async () => {
    vi.stubEnv('GEMINI_MODEL_CHEAP', 'gemini-2.0-flash-lite');
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const getGenerativeModelSpy = vi.fn().mockReturnValue({
      generateContent: mockGenerateContent.mockResolvedValueOnce(
        makeSuccessResponse({ name: 'Dish', calories: 100 }),
      ),
    });
    vi.mocked(GoogleGenerativeAI).mockImplementationOnce(
      () =>
        ({
          getGenerativeModel: getGenerativeModelSpy,
        }) as never,
    );

    const envClient = new GeminiLlmClient();
    await envClient.generateStructured({ system: 's', user: 'u', schema: DishSchema });

    expect(getGenerativeModelSpy).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gemini-2.0-flash-lite' }),
    );
  });

  // -------------------------------------------------------------------------
  // Missing API key → throws on construction
  // -------------------------------------------------------------------------

  it('throws immediately if GEMINI_API_KEY is not set', () => {
    vi.unstubAllEnvs(); // clear the stub set in beforeEach
    expect(() => new GeminiLlmClient()).toThrow(/GEMINI_API_KEY/);
  });
});
