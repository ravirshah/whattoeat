import { z } from 'zod';
import { ActivityLevel, Goal, MacroTargets } from './profile';

// ---------------------------------------------------------------------------
// HealthExtraction — the structured output of the health-doc extractor
// ---------------------------------------------------------------------------

export const DocType = z.enum([
  'bloodwork',
  'body_composition',
  'fitness_tracker',
  'training_plan',
  'unknown',
]);
export type DocType = z.infer<typeof DocType>;

export const HealthMarker = z.object({
  name: z.string(),
  value: z.union([z.number(), z.string()]),
  unit: z.string().nullable(),
});
export type HealthMarker = z.infer<typeof HealthMarker>;

export const HealthSuggested = z.object({
  activity_level: ActivityLevel.optional(),
  goal: Goal.optional(),
  targets: MacroTargets.partial().optional(),
  notes: z.array(z.string()).optional(),
});
export type HealthSuggested = z.infer<typeof HealthSuggested>;

export const HealthExtraction = z.object({
  docType: DocType,
  markers: z.array(HealthMarker),
  suggested: HealthSuggested,
  /** Max 280 chars — what the AI "read". Must NOT include raw marker values. */
  summary: z.string().max(280),
});
export type HealthExtraction = z.infer<typeof HealthExtraction>;

// ---------------------------------------------------------------------------
// ExtractionStatus — lifecycle of a stored extraction
// ---------------------------------------------------------------------------

export const ExtractionStatus = z.enum(['pending', 'applied', 'discarded']);
export type ExtractionStatus = z.infer<typeof ExtractionStatus>;

// ---------------------------------------------------------------------------
// StoredHealthExtraction — the DB row shape (after insert)
// ---------------------------------------------------------------------------

export const StoredHealthExtraction = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  doc_type: DocType,
  markers: z.array(HealthMarker),
  suggested: HealthSuggested,
  summary: z.string(),
  status: ExtractionStatus,
  created_at: z.string().datetime(),
});
export type StoredHealthExtraction = z.infer<typeof StoredHealthExtraction>;
