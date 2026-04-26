import type { Ingredient, Macros, Step } from '@/contracts/zod';
import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const recipes = pgTable(
  'recipes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    ingredients: jsonb('ingredients').$type<Ingredient[]>().notNull(),
    steps: jsonb('steps').$type<Step[]>().notNull(),
    macros: jsonb('macros').$type<Macros>().notNull(),
    servings: integer('servings').notNull(),
    total_minutes: integer('total_minutes').notNull(),
    cuisine: text('cuisine'),
    tags: jsonb('tags').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    source: text('source').notNull(),
    generated_run_id: uuid('generated_run_id'),
    saved: boolean('saved').notNull().default(false),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userSavedIdx: index('recipes_user_saved_created_idx').on(t.user_id, t.saved, t.created_at),
  }),
);

export type RecipeRow = typeof recipes.$inferSelect;
export type RecipeInsert = typeof recipes.$inferInsert;
