import "dotenv/config";

import type { Config } from "drizzle-kit";

export default {
	schema: "./src/schema.ts",
	out: "./drizzle",
	driver: "pg",
	dbCredentials: {
		connectionString: process.env.DATABASE_URL!,
	},
	verbose: true,
} satisfies Config;
