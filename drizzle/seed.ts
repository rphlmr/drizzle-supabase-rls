import { seed } from "../src/db/data-seeds";

seed()
	.then(() => {
		console.log("✅ Users seeded");
		process.exit(0);
	})
	.catch((err) => {
		console.error("❌ Users seed failed");
		console.error(err);
		process.exit(1);
	});
