import type { HealthExtraction } from '@/contracts/zod/health';
import type { LlmClient, LlmGenerateArgs, LlmGenerateResult } from '@/engine/ports/llm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/server/auth', () => ({
  requireUser: vi.fn().mockResolvedValue({ userId: 'user-test-abc', email: 'test@example.com' }),
}));

vi.mock('@/db/client', () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([
      {
        id: 'extraction-uuid-1',
        user_id: 'user-test-abc',
        doc_type: 'bloodwork',
        markers: [],
        suggested: {},
        summary: 'Recent bloodwork panel.',
        status: 'pending',
        created_at: new Date().toISOString(),
      },
    ]),
  },
}));

vi.mock('@/db/schema/health-extractions', () => ({
  healthExtractions: { id: 'id', user_id: 'user_id' },
}));

// ---------------------------------------------------------------------------
// Canned extraction
// ---------------------------------------------------------------------------

const CANNED_EXTRACTION: HealthExtraction = {
  docType: 'bloodwork',
  markers: [
    { name: 'HbA1c', value: 5.4, unit: '%' },
    { name: 'Fasting glucose', value: 92, unit: 'mg/dL' },
    { name: 'Vitamin D', value: 24, unit: 'ng/mL' },
  ],
  suggested: {
    notes: ['Consider vitamin D-rich foods — level is on the lower end.'],
  },
  summary: 'Bloodwork panel with metabolic and vitamin markers.',
};

class FakeHealthLlmClient implements LlmClient {
  async generateStructured<T>(args: LlmGenerateArgs<T>): Promise<LlmGenerateResult<T>> {
    const value = args.schema.parse(CANNED_EXTRACTION) as T;
    return { value, tokens: { prompt: 50, completion: 30 }, modelUsed: 'fake-health-v1' };
  }
}

class ErrorLlmClient implements LlmClient {
  async generateStructured<T>(_args: LlmGenerateArgs<T>): Promise<LlmGenerateResult<T>> {
    throw new Error('LLM unavailable');
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('extractHealthDoc', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns extraction with id on happy path', async () => {
    const { extractHealthDoc } = await import('@/server/profile/extract-health-doc');
    const result = await extractHealthDoc(
      { text: 'HbA1c 5.4%, fasting glucose 92 mg/dL, vitamin D 24 ng/mL' },
      new FakeHealthLlmClient(),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe('extraction-uuid-1');
      expect(result.value.docType).toBe('bloodwork');
      expect(result.value.markers).toHaveLength(3);
    }
  });

  it('returns validation_failed when text is empty', async () => {
    const { extractHealthDoc } = await import('@/server/profile/extract-health-doc');
    const result = await extractHealthDoc({ text: '   ' }, new FakeHealthLlmClient());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('validation_failed');
      expect(result.error.message).toMatch(/empty/i);
    }
  });

  it('returns validation_failed when text exceeds 8000 chars', async () => {
    const { extractHealthDoc } = await import('@/server/profile/extract-health-doc');
    const longText = 'x'.repeat(8001);
    const result = await extractHealthDoc({ text: longText }, new FakeHealthLlmClient());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('validation_failed');
      expect(result.error.message).toMatch(/long/i);
    }
  });

  it('returns engine_failed when LLM throws', async () => {
    const { extractHealthDoc } = await import('@/server/profile/extract-health-doc');
    const result = await extractHealthDoc(
      { text: 'Some document text here' },
      new ErrorLlmClient(),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('engine_failed');
    }
  });

  it('does not include raw document text in the extraction result', async () => {
    const { extractHealthDoc } = await import('@/server/profile/extract-health-doc');

    // The extraction result should contain only structured data (docType, markers,
    // suggested, summary) — never the raw input text.
    const sensitiveText = 'PATIENT: John Doe  SSN 123-45-6789  HbA1c 5.4%';
    const result = await extractHealthDoc({ text: sensitiveText }, new FakeHealthLlmClient());

    expect(result.ok).toBe(true);
    if (result.ok) {
      // Serialise the result and assert the raw PII is absent.
      const serialised = JSON.stringify(result.value);
      expect(serialised).not.toContain('SSN 123-45-6789');
      expect(serialised).not.toContain('PATIENT: John Doe');
    }
  });
});
