-- Add foreign key from cooked_log.recipe_id → recipes.id so PostgREST can
-- expose the relationship for embedded selects (e.g.
-- supabase.from('cooked_log').select('recipe:recipes(title)')).
--
-- Without this FK, PostgREST returns:
--   "Could not find a relationship between 'cooked_log' and 'recipes'
--    in the schema cache"

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'cooked_log_recipe_id_fkey'
      AND table_name = 'cooked_log'
  ) THEN
    ALTER TABLE cooked_log
      ADD CONSTRAINT cooked_log_recipe_id_fkey
      FOREIGN KEY (recipe_id)
      REFERENCES recipes(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- Ask PostgREST to refresh its schema cache so the new relationship is
-- visible immediately. Safe to run repeatedly.
NOTIFY pgrst, 'reload schema';
