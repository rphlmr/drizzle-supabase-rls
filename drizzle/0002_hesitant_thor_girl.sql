CREATE SCHEMA IF NOT EXISTS "auth";

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth"."users" ("id" uuid PRIMARY KEY NOT NULL);

--> statement-breakpoint
DO $$ BEGIN
ALTER TABLE "user"
ADD CONSTRAINT "user_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE no ACTION;

EXCEPTION
WHEN duplicate_object THEN NULL;

END $$;