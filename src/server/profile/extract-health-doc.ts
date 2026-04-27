'use server';

import type { HealthExtraction } from '@/contracts/zod/health';
import { db } from '@/db/client';
import { healthExtractions } from '@/db/schema/health-extractions';
import { buildHealthDocExtractionPrompt } from '@/engine/health-prompt';
import type { LlmClient } from '@/engine/ports/llm';
import { resolveClient } from '@/lib/feed-me/resolveClient';
import { requireUser } from '@/server/auth';
import type { ActionResult } from '@/server/contracts';
import { ServerError } from '@/server/contracts';

const MAX_TEXT_LENGTH = 8000;

/**
 * Sends the user's health document text to the LLM for extraction,
 * persists the structured result (not the raw text), and returns the extraction.
 *
 * Privacy posture: raw document text is NEVER stored. Only the structured
 * extraction (markers + suggested adjustments + summary) is persisted.
 */
export async function extractHealthDoc(
  input: { text: string },
  clientOverride?: LlmClient,
): Promise<ActionResult<HealthExtraction & { id: string }>> {
  const { userId } = await requireUser();

  const text = input.text.trim();

  if (!text) {
    return {
      ok: false,
      error: new ServerError('validation_failed', 'Document text cannot be empty.'),
    };
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return {
      ok: false,
      error: new ServerError(
        'validation_failed',
        `Document is too long. Paste up to ${MAX_TEXT_LENGTH} characters.`,
      ),
    };
  }

  const client = resolveClient(clientOverride);
  const { system, user, schema } = buildHealthDocExtractionPrompt(text);

  let extraction: HealthExtraction;
  try {
    const result = await client.generateStructured({ system, user, schema });
    extraction = result.value;
  } catch (err) {
    return {
      ok: false,
      error: new ServerError(
        'engine_failed',
        'Could not read your document. Try again or skip this step.',
        err,
      ),
    };
  }

  // Persist only the structured extraction — raw text is discarded here.
  const rows = await db
    .insert(healthExtractions)
    .values({
      user_id: userId,
      doc_type: extraction.docType,
      markers: extraction.markers,
      suggested: extraction.suggested,
      summary: extraction.summary,
      status: 'pending',
    })
    .returning();

  const row = rows[0];
  if (!row) {
    return {
      ok: false,
      error: new ServerError('internal', 'Failed to save extraction. Please try again.'),
    };
  }

  return {
    ok: true,
    value: {
      id: row.id,
      docType: extraction.docType,
      markers: extraction.markers,
      suggested: extraction.suggested,
      summary: extraction.summary,
    },
  };
}
