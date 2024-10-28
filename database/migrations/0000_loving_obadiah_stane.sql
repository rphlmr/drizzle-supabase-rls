CREATE TABLE IF NOT EXISTS "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "realtime"."messages" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"topic" text NOT NULL,
	"extension" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "realtime"."messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rooms" (
	"id" bigint PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY (sequence name "rooms_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"topic" text NOT NULL,
	CONSTRAINT "rooms_topic_key" UNIQUE("topic")
);
--> statement-breakpoint
ALTER TABLE "rooms" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rooms_users" (
	"user_id" uuid NOT NULL,
	"room_topic" text NOT NULL,
	"joined_at" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rooms_users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rooms_users" ADD CONSTRAINT "rooms_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rooms_users" ADD CONSTRAINT "rooms_users_room_topic_fk" FOREIGN KEY ("room_topic") REFERENCES "public"."rooms"("topic") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE POLICY "authenticated can view all profiles" ON "profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "supabase_auth_admin can insert profile" ON "profiles" AS PERMISSIVE FOR INSERT TO "supabase_auth_admin" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "authenticated can read broadcast and presence state" ON "realtime"."messages" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (
					select 1 from "rooms_users" where 
					("rooms_users"."user_id" = (select auth.uid()) and "rooms_users"."room_topic" = realtime.topic() and "messages"."extension" in ('presence', 'broadcast'))
				));--> statement-breakpoint
CREATE POLICY "authenticated can send broadcast and track presence" ON "realtime"."messages" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (exists (
					select 1 from "rooms_users" where 
					("rooms_users"."user_id" = (select auth.uid()) and "rooms_users"."room_topic" = realtime.topic() and "messages"."extension" in ('presence', 'broadcast'))
				));--> statement-breakpoint
CREATE POLICY "authenticated can read rooms" ON "rooms" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "authenticated can add rooms" ON "rooms" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "authenticated can read rooms_users" ON "rooms_users" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "authenticated can add rooms_users" ON "rooms_users" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (true);