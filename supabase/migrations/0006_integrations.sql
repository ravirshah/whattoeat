-- Multi-provider integrations table.
-- Stores encrypted OAuth/credential blobs for external data sources
-- (Eight Sleep, Whoop, Oura, Apple Health, Superpower Labs, MFP, etc.).
--
-- Credential plaintext is never stored — `credentials` holds an AES-256-GCM
-- ciphertext sealed with INTEGRATIONS_ENC_KEY. Service-role only; no anon
-- access via RLS (table has RLS enabled and no policies).

CREATE TABLE IF NOT EXISTS "integrations" (
  "user_id" uuid NOT NULL,
  "provider" text NOT NULL,
  "status" text NOT NULL DEFAULT 'connected',
  "credentials" bytea NOT NULL,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "connected_at" timestamp with time zone NOT NULL DEFAULT now(),
  "last_synced_at" timestamp with time zone,
  "last_error" text,
  PRIMARY KEY ("user_id", "provider")
);
--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES auth.users(id) ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "integrations_status_idx"
  ON "integrations" USING btree ("status");
--> statement-breakpoint
-- Enable RLS. No policies = no client access (anon + authenticated both blocked).
-- Reads/writes happen exclusively via service-role from server actions and crons.
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
