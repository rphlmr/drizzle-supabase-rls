/**
 * This is the configuration for the server-side database.
 */

import { defineConfig } from "drizzle-kit";

const base = "./database";

export default defineConfig({
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  schema: `${base}/schema.ts`,
  out: `${base}/migrations`,
  verbose: false,
  schemaFilter: ["public"],
  entities: {
    roles: {
      provider: "supabase",
    },
  },
});
