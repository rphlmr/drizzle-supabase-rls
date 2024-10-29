import type { JwtPayload } from "jwt-decode";
import { sql } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";

export type SupabaseToken = JwtPayload & { role: string };

export function createDrizzle<Database extends PgDatabase<any, any, any>>(
  token: SupabaseToken,
  { admin, client }: { admin: Database; client: Database }
) {
  return {
    admin,
    rls: (async (transaction, ...rest) => {
      return await client.transaction(async (tx) => {
        // Supabase exposes auth.uid() and auth.jwt()
        // https://supabase.com/docs/guides/database/postgres/row-level-security#helper-functions
        try {
          await tx.execute(sql`
          -- auth.jwt()
          select set_config('request.jwt.claims', '${sql.raw(
            JSON.stringify(token)
          )}', TRUE);
          -- auth.uid()
          select set_config('request.jwt.claim.sub', '${sql.raw(
            token.sub ?? ""
          )}', TRUE);												
          set local role ${sql.raw(token.role)};
          `);
          return await transaction(tx);
        } finally {
          await tx.execute(sql`
            -- reset
            select set_config('request.jwt.claims', NULL, TRUE);
            select set_config('request.jwt.claim.sub', NULL, TRUE);
            reset role;
            `);
        }
      }, ...rest);
    }) as typeof client.transaction,
  };
}
