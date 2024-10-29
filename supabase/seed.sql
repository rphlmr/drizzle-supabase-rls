CREATE USER rls_client
WITH
  LOGIN PASSWORD 'postgres';

GRANT anon TO rls_client;

GRANT authenticated TO rls_client;