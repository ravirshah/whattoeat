import { RecommendationContext } from '@/contracts/zod';
import { z } from 'zod';

export const EvalEntry = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  ctx: RecommendationContext,
  /** Assertions that must hold on the result. */
  rubric: z.object({
    minCandidates: z.number().int().min(1).default(1),
    /** If true, result.ok must be false (error test). */
    expectError: z.boolean().default(false),
    /** Allergen keywords that must NOT appear in any ingredient. */
    forbiddenIngredients: z.array(z.string()).default([]),
    /** If set, all candidates must have totalMinutes <= this. */
    maxMinutes: z.number().int().optional(),
  }),
});

export type EvalEntry = z.infer<typeof EvalEntry>;

export const EvalDataset = z.array(EvalEntry);
export type EvalDataset = z.infer<typeof EvalDataset>;
