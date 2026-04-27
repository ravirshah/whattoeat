CREATE TABLE IF NOT EXISTS "weekly_insights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"week_start_date" date NOT NULL,
	"insight_text" text NOT NULL,
	"family" text NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "weekly_insights_user_week_unique" ON "weekly_insights" USING btree ("user_id","week_start_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "weekly_insights_user_week_idx" ON "weekly_insights" USING btree ("user_id","week_start_date");
-- Enable RLS
alter table weekly_insights enable row level security;

-- Users can only read their own weekly insights rows.
create policy weekly_insights_self_select on weekly_insights for select using (auth.uid() = user_id);
-- Inserts/upserts happen via service-role (server-side only).
