CREATE TABLE IF NOT EXISTS "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"display_name" text,
	"goal" text NOT NULL,
	"target_kcal" integer NOT NULL,
	"target_protein_g" integer NOT NULL,
	"target_carbs_g" integer NOT NULL,
	"target_fat_g" integer NOT NULL,
	"height_cm" numeric(5, 1),
	"weight_kg" numeric(5, 1),
	"birthdate" date,
	"sex" text,
	"activity_level" text,
	"allergies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"dislikes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cuisines" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"equipment" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pantry_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"category" text NOT NULL,
	"available" boolean DEFAULT true NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"energy" smallint NOT NULL,
	"training" text NOT NULL,
	"hunger" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"ingredients" jsonb NOT NULL,
	"steps" jsonb NOT NULL,
	"macros" jsonb NOT NULL,
	"servings" integer NOT NULL,
	"total_minutes" integer NOT NULL,
	"cuisine" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source" text NOT NULL,
	"generated_run_id" uuid,
	"saved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cooked_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"recipe_id" uuid NOT NULL,
	"cooked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"rating" smallint,
	"note" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recommendation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"context_snapshot" jsonb NOT NULL,
	"candidates" jsonb NOT NULL,
	"model" text NOT NULL,
	"prompts_version" text NOT NULL,
	"prompt_tokens" integer NOT NULL,
	"completion_tokens" integer NOT NULL,
	"latency_ms" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "signal_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"source" text NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pantry_items_user_available_idx" ON "pantry_items" USING btree ("user_id","available");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "pantry_items_user_name_unique" ON "pantry_items" USING btree ("user_id",lower("name"));--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "checkins_user_date_idx" ON "checkins" USING btree ("user_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "checkins_user_date_unique" ON "checkins" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recipes_user_saved_created_idx" ON "recipes" USING btree ("user_id","saved","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cooked_log_user_cooked_at_idx" ON "cooked_log" USING btree ("user_id","cooked_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recommendation_runs_user_created_idx" ON "recommendation_runs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "signal_snapshots_user_observed_idx" ON "signal_snapshots" USING btree ("user_id","observed_at");
-- Enable RLS on all tables
alter table profiles               enable row level security;
alter table pantry_items           enable row level security;
alter table checkins               enable row level security;
alter table recipes                enable row level security;
alter table cooked_log             enable row level security;
alter table recommendation_runs    enable row level security;
alter table signal_snapshots       enable row level security;

-- profiles: 1:1 with auth.users
alter table profiles add constraint profiles_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

create policy profiles_self_select on profiles for select using (auth.uid() = user_id);
create policy profiles_self_insert on profiles for insert with check (auth.uid() = user_id);
create policy profiles_self_update on profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy profiles_self_delete on profiles for delete using (auth.uid() = user_id);

-- pantry_items
create policy pantry_self_all on pantry_items for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- checkins
create policy checkins_self_all on checkins for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- recipes
create policy recipes_self_all on recipes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- cooked_log
create policy cooked_log_self_all on cooked_log for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- recommendation_runs: clients READ-ONLY; inserts via service-role only.
create policy recommendation_runs_self_select on recommendation_runs for select using (auth.uid() = user_id);
-- (no insert/update/delete policy = denied for non-service-role)

-- signal_snapshots: clients READ-ONLY; writes via verified webhook + service-role only.
create policy signal_snapshots_self_select on signal_snapshots for select using (auth.uid() = user_id);

-- Helpful: a function to set updated_at on profiles + recipes
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger profiles_set_updated_at before update on profiles
  for each row execute procedure set_updated_at();

create trigger recipes_set_updated_at before update on recipes
  for each row execute procedure set_updated_at();
