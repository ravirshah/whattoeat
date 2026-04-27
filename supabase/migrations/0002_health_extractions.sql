CREATE TABLE IF NOT EXISTS "health_extractions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"doc_type" text NOT NULL,
	"markers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"suggested" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"summary" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "health_extractions" ADD CONSTRAINT "health_extractions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES auth.users(id) ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "health_extractions_user_created_idx"
  ON "health_extractions" USING btree ("user_id", "created_at");
-- Enable RLS
ALTER TABLE health_extractions ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only see and modify their own rows
CREATE POLICY health_extractions_self_select ON health_extractions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY health_extractions_self_insert ON health_extractions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY health_extractions_self_update ON health_extractions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY health_extractions_self_delete ON health_extractions
  FOR DELETE USING (auth.uid() = user_id);
