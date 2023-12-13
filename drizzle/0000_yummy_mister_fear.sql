CREATE TABLE IF NOT EXISTS "faction" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quote" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"text" text NOT NULL,
	"author_id" uuid NOT NULL
);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);

--> statement-breakpoint
DO $$ BEGIN
ALTER TABLE "faction"
ADD CONSTRAINT "faction_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE no ACTION;

EXCEPTION
WHEN duplicate_object THEN NULL;

END $$;

--> statement-breakpoint
DO $$ BEGIN
ALTER TABLE "quote"
ADD CONSTRAINT "quote_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE no ACTION;

EXCEPTION
WHEN duplicate_object THEN NULL;

END $$;

-- Enable RLS --
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "faction" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "quote" ENABLE ROW LEVEL SECURITY;