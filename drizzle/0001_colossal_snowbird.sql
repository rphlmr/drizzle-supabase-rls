-- Gets the user faction from transaction settings.
CREATE OR REPLACE FUNCTION auth.faction() RETURNS text AS $$
SELECT nullif(current_setting('user.faction', TRUE), '')::text;

$$ language SQL stable;

-- RLS Policies --
CREATE POLICY "User can only read its row" ON "public"."user" AS PERMISSIVE FOR
SELECT TO authenticated USING (
		(
			(
				SELECT auth.uid()
			) = id
		)
	);

CREATE POLICY "User can update its name" ON "public"."user" AS PERMISSIVE FOR
UPDATE TO public USING (
		(
			(
				SELECT auth.uid() AS uid
			) = id
		)
	) WITH CHECK (
		(
			(
				SELECT auth.uid() AS uid
			) = id
		)
	);

CREATE POLICY "User can read all quotes" ON "public"."quote" AS PERMISSIVE FOR
SELECT TO authenticated USING (TRUE);

CREATE POLICY "User can insert quotes" ON "public"."quote" AS PERMISSIVE FOR
INSERT TO authenticated WITH CHECK (
		(
			SELECT auth.uid()
		) = author_id
	);

CREATE POLICY "User can delete its quotes" ON "public"."quote" AS PERMISSIVE FOR DELETE TO public USING (
	(
		SELECT auth.uid()
	) = author_id
);

CREATE POLICY "User can only list users of the same faction" ON "public"."faction" AS PERMISSIVE FOR
SELECT TO authenticated USING (
		(
			SELECT auth.faction()
		) = name
	);