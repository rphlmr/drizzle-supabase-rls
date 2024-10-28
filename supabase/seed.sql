CREATE USER drizzle_rls
WITH
  LOGIN PASSWORD 'postgres';

GRANT anon TO drizzle_rls;

GRANT authenticated TO drizzle_rls;