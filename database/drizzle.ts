import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { jwtDecode, JwtPayload } from "jwt-decode";
import postgres from "postgres";
import { DrizzleConfig, sql } from "drizzle-orm";

const config = {
  casing: "snake_case",
  schema,
} satisfies DrizzleConfig<typeof schema>;

const admin = drizzle(process.env.ADMIN_DATABASE_URL!, config);

function decode(accessToken: string) {
  try {
    return jwtDecode<JwtPayload & { role: string }>(accessToken);
  } catch (error) {
    return { role: "anon" } as JwtPayload & { role: string };
  }
}

// Shared client across all drizzle instances
const rlsClient = postgres(process.env.DATABASE_URL!, {
  prepare: false,
});

function withRLS(accessToken: string) {
  const decodedJwt = decode(accessToken);
  const db = drizzle(rlsClient, config);
  // @RyanClementsHax https://github.com/drizzle-team/drizzle-orm/discussions/2450#discussioncomment-9664333
  return new Proxy<typeof db>(db, {
    get(target, prop) {
      if (prop !== "transaction") {
        throw new Error("RLS requires to use a transaction");
      }

      if (prop === "transaction") {
        return (async (transaction, ...rest) => {
          return await target.transaction(async (tx) => {
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
        }) as typeof db.transaction;
      }
    },
  });
}

export function createDrizzleRLSClient(accessToken: string) {
  return { admin, rls: withRLS(accessToken) };
}
