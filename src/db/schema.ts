import { sql } from "drizzle-orm";
import { pgSchema, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { pgPolicy } from "drizzle-orm/pg-core/policy";
import { pgRole } from "drizzle-orm/pg-core/role";

export const authSchema = pgSchema("auth");

export const authUsers = authSchema.table("users", {
	id: uuid("id").primaryKey().notNull(),
});

export const user = pgTable("user", {
	id: uuid("id")
		.primaryKey()
		.notNull()
		.references(() => authUsers.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
}).enableRLS();

export const quote = pgTable("quote", {
	id: uuid("id").primaryKey().defaultRandom(),
	text: text("text").notNull(),
	authorId: uuid("author_id")
		.references(() => user.id, { onDelete: "cascade" })
		.notNull(),
}).enableRLS();

export const faction = pgTable("faction", {
	userId: uuid("user_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" })
		.notNull(),
	name: text("name", { enum: ["republic", "empire"] }).notNull(),
}).enableRLS();

/* -------------------------------------------------------------------------- */
/*                           Future implementation;                           */
/* -------------------------------------------------------------------------- */

export const authenticated = pgRole("authenticated");

// TODO: replace implementation
// function pgPolicy(p1: any, p2: any, p3: any) {}

// CREATE POLICY "User can only read its row" ON "public"."user" AS PERMISSIVE FOR
// SELECT TO authenticated USING (
// 		(
// 			(
// 				SELECT auth.uid()
// 			) = id
// 		)
// 	);
export const userReadPolicy = pgPolicy("User can only read its row", user, {
	as: "permissive",
	for: "select",
	to: [authenticated],
	using: sql`(SELECT auth.uid()) = id`,
});

// CREATE POLICY "User can update its name" ON "public"."user"
// AS PERMISSIVE FOR UPDATE
// TO public
// USING ((( SELECT auth.uid() AS uid) = id))
// WITH CHECK ((( SELECT auth.uid() AS uid) = id));
export const userUpdatePolicy = pgPolicy("User can update its name", user, {
	as: "permissive",
	for: "update",
	to: [authenticated],
	using: sql`(SELECT auth.uid()) = id`,
	withCheck: sql`(SELECT auth.uid()) = id`,
});

// CREATE POLICY "User can read all quotes" ON "public"."quote" AS PERMISSIVE FOR
// SELECT TO authenticated USING (TRUE);
export const quoteReadPolicy = pgPolicy("User can read all quotes", quote, {
	as: "permissive",
	for: "select",
	to: [authenticated],
	using: sql`true`,
});

// CREATE POLICY "User can insert quotes" ON "public"."quote"
// AS PERMISSIVE FOR INSERT
// TO authenticated

// WITH CHECK (( SELECT auth.uid() ) = author_id);
export const quoteInsertPolicy = pgPolicy("User can insert quotes", quote, {
	as: "permissive",
	for: "insert",
	to: [authenticated],
	withCheck: sql`(SELECT auth.uid()) = author_id`,
});

// CREATE POLICY "User can delete its quotes" ON "public"."quote" AS PERMISSIVE FOR DELETE TO public USING (
// 	(
// 		SELECT auth.uid()
// 	) = author_id
// );
export const quoteDeletePolicy = pgPolicy("User can delete its quotes", quote, {
	as: "permissive",
	for: "insert",
	to: [authenticated],
	using: sql`(SELECT auth.uid()) = author_id`,
});

// CREATE POLICY "User can only list users of the same faction" ON "public"."faction" AS PERMISSIVE FOR
// SELECT TO authenticated USING (
// 		(
// 			SELECT auth.faction()
// 		) = name
// 	);
export const factionInsertPolicy = pgPolicy(
	"User can only list users of the same faction",
	faction,
	{
		as: "permissive",
		for: "insert",
		to: [authenticated],
		using: sql`(SELECT auth.faction()) = name`,
	},
);
