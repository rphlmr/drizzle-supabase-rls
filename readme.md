# Drizzle Supabase RLS

# Requirements
- Docker (https://docs.docker.com/get-docker/)
- Supabase cli (https://github.com/supabase/cli)

> Doc: https://supabase.com/docs/guides/cli/local-development

## Initial setup
### Install dependencies
```bash
(npm|pnpm|yarn) install
```

### Start Supabase services
```bash
supabase start
```
Once all of the Supabase services are running, you'll see output containing your local Supabase credentials.
It should look like this, with urls and keys that you'll use in the project:

```txt
Started supabase local development setup.

         API URL: http://127.0.0.1:54321
     GraphQL URL: http://127.0.0.1:54321/graphql/v1
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
    Inbucket URL: http://127.0.0.1:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhbGci.....
service_role key: eyJhbGci....
```
> **Note**
> I have made a dump of the auth.users table that is applied by Supabase on the first start. `supabase/seed.sql`


### Copy the `.env.example` file to `.env`
> You can keep the default value for `DATABASE_URL`

In your `.env` file, set the following environment variables (from the output above):
- `SUPABASE_ANON_KEY` ➡️ `anon key`
  > [This public sharable key is used in combination with RLS.](https://supabase.com/docs/guides/api/api-keys#the-anon-key)
- `SUPABASE_SERVICE_KEY` ➡️ `service_role key`
  > [This private secret key bypass RLS](https://supabase.com/docs/guides/api/api-keys#the-servicerole-key)
- `SUPABASE_API_URL` ➡️ `API URL`
  > Used by Supabase SDK. We need it to seed some data. 

> **Note**
> We will enable RLS on all table and use the `SUPABASE_ANON_KEY` when a user want to access the data.

### Deploy the migration
```bash
(npm|pnpm|yarn) run migration:deploy
```

### Seed the database
```bash
(npm|pnpm|yarn) run db:seed
```

## Supabase Dashboard (Studio)
http://127.0.0.1:54323

## Supabase cli quick commands
```bash	
supabase start # Start Supabase services
supabase stop  # Stop Supabase services
supabase stop --no-backup # Stop Supabase services and reset your local database
```

## Deploy migration and seed the DB
```bash
# In a terminal, run
(npm|pnpm|yarn) run seed
```

# How to test the incoming Drizzle RLS Support
I have defined some policies on this project (`0001_colossal_snowbird.sql`).

You can delete them and re-create them in the Drizzle schema.

> **Note**
> In order to going further, I have created a custom auth function to use in a policies.
> It should demonstrate that we can inject any configuration we want in the transaction.
> 
> ```sql
> create or replace function auth.faction() returns text as $$
>  select nullif(current_setting('user.faction', true), '')::text;
> $$ language sql stable;
> ```

## Deleting a policy
```sql
DROP POLICY IF EXISTS "Full policy name" ON "public"."the_table_name";

DROP POLICY IF EXISTS "User can only read its row" ON "public"."user";
DROP POLICY IF EXISTS "User can update its name" ON "public"."user";
DROP POLICY IF EXISTS "User can read all quotes" ON "public"."quote";
DROP POLICY IF EXISTS "User can insert quotes" ON "public"."quote";
DROP POLICY IF EXISTS "User can delete its quotes" ON "public"."quote";

-- Special goodies: use a custom auth function --
DROP POLICY IF EXISTS "User can only list users of the same faction" ON "public"."faction";
```
## Disabling RLS on a table
```sql
ALTER TABLE "the_table_name" DISABLE ROW LEVEL SECURITY;
```

# I am stuck, I have errors on push

Stop Supabase services and delete docker containers/volumes and start again 😂.

```bash
# In a terminal, run
supabase stop --no-backup
```
