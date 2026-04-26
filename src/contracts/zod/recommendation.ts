import { z } from 'zod';
import { Checkin } from './checkin';
import { PantryItem } from './pantry';
import { Profile } from './profile';
import { Ingredient, Macros, Step } from './recipe';
import { HealthSignals } from './signals';

export const MealType = z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'any']);
export type MealType = z.infer<typeof MealType>;

export const RecommendationRequest = z.object({
  mealType: MealType.default('any'),
  timeBudgetMin: z.number().int().min(5).max(180).nullable().optional(),
  candidateCount: z.number().int().min(1).max(5).default(3),
});
export type RecommendationRequest = z.infer<typeof RecommendationRequest>;

export const RecommendationContext = z.object({
  pantry: z.array(PantryItem),
  profile: Profile,
  checkin: Checkin.optional(),
  signals: HealthSignals.optional(),
  request: RecommendationRequest,
});
export type RecommendationContext = z.infer<typeof RecommendationContext>;

export const MealCandidate = z.object({
  title: z.string().min(1).max(120),
  oneLineWhy: z.string().min(1).max(280),
  ingredients: z.array(Ingredient).min(1).max(50),
  steps: z.array(Step).min(1).max(40),
  estMacros: Macros,
  servings: z.number().int().min(1).max(20),
  totalMinutes: z.number().int().min(1).max(480),
  cuisine: z.string().max(40).nullable(),
  tags: z.array(z.string().min(1).max(40)).default([]),
  pantryCoverage: z.number().min(0).max(1),
  missingItems: z.array(z.string()).default([]),
});
export type MealCandidate = z.infer<typeof MealCandidate>;

export const TokenUsage = z.object({
  prompt: z.number().int().nonnegative(),
  completion: z.number().int().nonnegative(),
});
export type TokenUsage = z.infer<typeof TokenUsage>;

export const RecommendationResult = z.object({
  candidates: z.array(MealCandidate).min(0).max(5),
  rationale: z.string().min(1).max(1000),
  modelUsed: z.string(),
  tokens: TokenUsage,
  latencyMs: z.number().int().nonnegative(),
});
export type RecommendationResult = z.infer<typeof RecommendationResult>;
