import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { jwtDecode, JwtPayload } from "jwt-decode";
import postgres from "postgres";
import { DrizzleConfig, sql } from "drizzle-orm";

const config = {
  casing: "snake_case",
  schema,
} satisfies DrizzleConfig<typeof schema>;

function decode(accessToken: string) {
  try {
    return jwtDecode<JwtPayload & { role: string }>(accessToken);
  } catch (error) {
    return { role: "anon" } as JwtPayload & { role: string };
  }
}

// ByPass RLS
const admin = drizzle(
  postgres(process.env.ADMIN_DATABASE_URL!, { prepare: false }),
  config
);

// Shared client across all drizzle instances. Uses a low privilege user
const RLSClient = postgres(process.env.DATABASE_URL!, {
  prepare: false,
});

export function createDrizzle(accessToken: string) {
  const decodedJwt = decode(accessToken);
  const db = drizzle(RLSClient, config);

  return {
    admin,
    rls: (async (transaction, ...rest) => {
      return await db.transaction(async (tx) => {
        // Supabase exposes auth.uid() and auth.jwt()
        // https://supabase.com/docs/guides/database/postgres/row-level-security#helper-functions
        try {
          await tx.execute(sql`
          -- auth.jwt()
          select set_config('request.jwt.claims', '${sql.raw(
            JSON.stringify(decodedJwt)
          )}', TRUE);
          -- auth.uid()
          select set_config('request.jwt.claim.sub', '${sql.raw(
            decodedJwt.sub ?? ""
          )}', TRUE);												
          set local role ${sql.raw(decodedJwt.role)};
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
    }) as typeof db.transaction,
  };
}
