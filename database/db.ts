import { drizzle } from "drizzle-orm/postgres-js";

const db = drizzle(process.env.DATABASE_URL!, { casing: "snake_case" });
