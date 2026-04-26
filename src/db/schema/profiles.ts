import { sql } from 'drizzle-orm';
import { date, integer, jsonb, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const profiles = pgTable('profiles', {
  user_id: uuid('user_id').primaryKey(),
  display_name: text('display_name'),
  goal: text('goal').notNull(),
  target_kcal: integer('target_kcal').notNull(),
  target_protein_g: integer('target_protein_g').notNull(),
  target_carbs_g: integer('target_carbs_g').notNull(),
  target_fat_g: integer('target_fat_g').notNull(),
  height_cm: numeric('height_cm', { precision: 5, scale: 1 }),
  weight_kg: numeric('weight_kg', { precision: 5, scale: 1 }),
  birthdate: date('birthdate'),
  sex: text('sex'),
  activity_level: text('activity_level'),
  allergies: jsonb('allergies').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  dislikes: jsonb('dislikes').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  cuisines: jsonb('cuisines').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  equipment: jsonb('equipment').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type ProfileRow = typeof profiles.$inferSelect;
export type ProfileInsert = typeof profiles.$inferInsert;
