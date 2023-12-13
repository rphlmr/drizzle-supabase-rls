import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function runMigrate() {
	if (!process.env.DATABASE_URL) {
		throw new Error("DATABASE_URL is not set");
	}

	const migrationsClient = postgres(process.env.DATABASE_URL, {
		max: 1,
	});

	const db = drizzle(migrationsClient, { logger: true });

	console.log("⏳ Running migrations...");

	const start = Date.now();

	await migrate(db, { migrationsFolder: `${__dirname}` });

	const end = Date.now();

	console.log(`✅ Migration end & took ${end - start}ms`);

	process.exit(0);
}

runMigrate().catch((err) => {
	console.error("❌ Migration failed");
	console.error(err);
	process.exit(1);
});
