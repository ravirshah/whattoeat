-- Adds the dietary_pattern column to profiles. Nullable text — keeps existing
-- rows valid; values are validated by the Zod DietaryPattern enum on read.
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "dietary_pattern" text;
