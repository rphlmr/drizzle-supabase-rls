import { describe, it, beforeEach, after } from "node:test";
import assert from "node:assert";
import { userSeeds } from "./db/data-seeds";
import { client, db } from "./db";
import { authenticated, faction, quote, user } from "./db/schema";
import { seed } from "./db/data-seeds";
import { eq, sql } from "drizzle-orm";
import { getUserAuthSession } from "./helper";
import { jwtDecode } from "jwt-decode";

async function resetDB() {
	// Delete all (cascade)
	await db.delete(user);
	// Re-seed db
	await seed();
}

beforeEach(async () => {
	await resetDB();
});

after(async () => {
	// Close db connection
	await client.end();
});

describe("user table", () => {
	describe("User can only read its row", () => {
		it("[before-drizzle-rls-support] conforms to RLS when using `set_config` in transaction", async () => {
			// Let's be closer to the real world and get user id from its auth session
			const session = await getUserAuthSession("yoda");

			const results = await db.transaction(async (tx) => {
				await tx.execute(
					sql`SELECT set_config('request.jwt.claims', '${sql.raw(
						JSON.stringify(jwtDecode(session.access_token)),
					)}', TRUE)`,
				);
				await tx.execute(sql`set local role authenticated`);

				return tx.select({ id: user.id }).from(user);
			});

			assert.equal(results.length, 1);
		});

		it("[drizzle-rls-support] conforms to RLS when using `rlsConfig` in transaction", async () => {
			// Let's be closer to the real world and get user id from its auth session
			const session = await getUserAuthSession("yoda");
			const txConfig = {
				rlsConfig: {
					role: authenticated,
					set: [
						{
							name: "request.jwt.claims",
							value: JSON.stringify(
								jwtDecode(session.access_token),
							),
						},
					],
				},
			};

			const results = await db.transaction(async (tx) => {
				return tx.select({ id: user.id }).from(user);
			}, txConfig);

			assert.equal(results.length, 1);
		});

		it("bypass RLS when using transaction with no config", async () => {
			const results = await db.transaction(async (tx) => {
				return tx.select({ id: user.id }).from(user);
			});

			assert.equal(results.length, Object.keys(userSeeds).length);
		});

		it("bypass RLS when not using transaction", async () => {
			const results = await db.select({ id: user.id }).from(user);

			assert.equal(results.length, Object.keys(userSeeds).length);
		});
	});

	describe("User can update its name", () => {
		it("[before-drizzle-rls-support] conforms to RLS when using `set_config` in transaction", async () => {
			// Let's be closer to the real world and get user id from its auth session
			const session = await getUserAuthSession("yoda");
			const newName = "Master Yoda";

			const results = await db.transaction(async (tx) => {
				await tx.execute(
					sql`SELECT set_config('request.jwt.claims', '${sql.raw(
						JSON.stringify(jwtDecode(session.access_token)),
					)}', TRUE)`,
				);
				await tx.execute(sql`set local role authenticated`);

				return tx
					.update(user)
					.set({ name: newName })
					.where(eq(user.id, session.user.id)) // better for performance even if RLS makes it useless
					.returning({ id: user.id, name: user.name });
			});

			assert.equal(results.length, 1);

			const [updatedUser] = results;

			assert.equal(updatedUser.id, session.user.id);
			assert.equal(updatedUser.name, newName);

			// can't update another user
			const otherUserResults = await db.transaction(async (tx) => {
				await tx.execute(
					sql`SELECT set_config('request.jwt.claims', '${sql.raw(
						JSON.stringify(jwtDecode(session.access_token)),
					)}', TRUE)`,
				);
				await tx.execute(sql`set local role authenticated`);

				return tx
					.update(user)
					.set({ name: newName })
					.where(eq(user.id, userSeeds.padawan.id))
					.returning({ id: user.id, name: user.name });
			});

			assert.equal(otherUserResults.length, 0);
		});

		it("[drizzle-rls-support] conforms to RLS when using `set_config` in transaction", async () => {
			// Let's be closer to the real world and get user id from its auth session
			const session = await getUserAuthSession("yoda");
			const newName = "Master Yoda";
			const txConfig = {
				rlsConfig: {
					role: authenticated,
					set: [
						{
							name: "request.jwt.claims",
							value: JSON.stringify(
								jwtDecode(session.access_token),
							),
						},
					],
				},
			};

			const results = await db.transaction(async (tx) => {
				return tx
					.update(user)
					.set({ name: newName })
					.where(eq(user.id, session.user.id)) // better for performance even if RLS makes it useless
					.returning({ id: user.id, name: user.name });
			}, txConfig);

			assert.equal(results.length, 1);

			const [updatedUser] = results;

			assert.equal(updatedUser.id, session.user.id);
			assert.equal(updatedUser.name, newName);

			// can't update another user
			const otherUserResults = await db.transaction(async (tx) => {
				return tx
					.update(user)
					.set({ name: newName })
					.where(eq(user.id, userSeeds.padawan.id))
					.returning({ id: user.id, name: user.name });
			}, txConfig);

			assert.equal(otherUserResults.length, 0);
		});

		it("bypass RLS when using transaction with no config", async () => {
			// Let's be closer to the real world and get user id from its auth session
			const session = await getUserAuthSession("yoda");
			const newName = "Master Yoda";

			const results = await db.transaction(async (tx) => {
				return tx
					.update(user)
					.set({ name: newName })
					.where(eq(user.id, session.user.id)) // better for performance even if RLS makes it useless
					.returning({ id: user.id, name: user.name });
			});

			assert.equal(results.length, 1);

			const [updatedUser] = results;

			assert.equal(updatedUser.id, session.user.id);
			assert.equal(updatedUser.name, newName);

			// can update another user
			const otherUserResults = await db.transaction(async (tx) => {
				return tx
					.update(user)
					.set({ name: newName })
					.where(eq(user.id, userSeeds.padawan.id))
					.returning({ id: user.id, name: user.name });
			});

			assert.equal(otherUserResults.length, 1);

			const [updatedOtherUser] = otherUserResults;

			assert.equal(updatedOtherUser.id, userSeeds.padawan.id);
			assert.equal(updatedUser.name, newName);
		});

		it("bypass RLS when not using transaction", async () => {
			const session = await getUserAuthSession("yoda");
			const newName = "Master Yoda";
			const results = await db
				.update(user)
				.set({ name: newName })
				.where(eq(user.id, session.user.id))
				.returning({ id: user.id, name: user.name });

			assert.equal(results.length, 1);

			const [updatedUser] = results;

			assert.equal(updatedUser.id, session.user.id);
			assert.equal(updatedUser.name, newName);
		});
	});
});

describe("quote table", () => {
	describe("User can read all quotes", () => {
		it("[before-drizzle-rls-support] conforms to RLS when using `set_config` in transaction", async () => {
			// Let's be closer to the real world and get user id from its auth session
			const session = await getUserAuthSession("yoda");

			const results = await db.transaction(async (tx) => {
				await tx.execute(
					sql`SELECT set_config('request.jwt.claims', '${sql.raw(
						JSON.stringify(jwtDecode(session.access_token)),
					)}', TRUE)`,
				);
				await tx.execute(sql`set local role authenticated`);

				return tx
					.select({ text: quote.text, authorId: quote.authorId })
					.from(quote);
			});

			assert.equal(results.length, Object.keys(userSeeds).length);
		});

		it("[drizzle-rls-support] conforms to RLS when using `set_config` in transaction", async () => {
			// Let's be closer to the real world and get user id from its auth session
			const session = await getUserAuthSession("yoda");
			const txConfig = {
				rlsConfig: {
					role: authenticated,
					set: [
						{
							name: "request.jwt.claims",
							value: JSON.stringify(
								jwtDecode(session.access_token),
							),
						},
					],
				},
			};

			const results = await db.transaction(async (tx) => {
				return tx
					.select({ text: quote.text, authorId: quote.authorId })
					.from(quote);
			}, txConfig);

			assert.equal(results.length, Object.keys(userSeeds).length);
		});

		it("bypass RLS when using transaction with no config", async () => {
			const results = await db.transaction(async (tx) => {
				return tx
					.select({ text: quote.text, authorId: quote.authorId })
					.from(quote);
			});

			assert.equal(results.length, Object.keys(userSeeds).length);
		});

		it("bypass RLS when not using transaction", async () => {
			const results = await db
				.select({ text: quote.text, authorId: quote.authorId })
				.from(quote);

			assert.equal(results.length, Object.keys(userSeeds).length);
		});
	});

	describe("User can insert quotes", () => {
		it("[before-drizzle-rls-support] conforms to RLS when using `set_config` in transaction", async () => {
			// Let's be closer to the real world and get user id from its auth session
			const session = await getUserAuthSession("yoda");
			const newQuote = "Always in motion is the future";

			const results = await db.transaction(async (tx) => {
				await tx.execute(
					sql`SELECT set_config('request.jwt.claims', '${sql.raw(
						JSON.stringify(jwtDecode(session.access_token)),
					)}', TRUE)`,
				);
				await tx.execute(sql`set local role authenticated`);

				return tx
					.insert(quote)
					.values({ text: newQuote, authorId: session.user.id })
					.returning({
						text: quote.text,
						authorId: quote.authorId,
					});
			});

			assert.equal(results.length, 1);

			const [newUserQuote] = results;

			assert.equal(newUserQuote.authorId, session.user.id);
			assert.equal(newUserQuote.text, newQuote);

			// can't add a quote for another user
			await assert.rejects(
				db.transaction(async (tx) => {
					await tx.execute(
						sql`SELECT set_config('request.jwt.claims', '${sql.raw(
							JSON.stringify(jwtDecode(session.access_token)),
						)}', TRUE)`,
					);
					await tx.execute(sql`set local role authenticated`);

					return tx
						.insert(quote)
						.values({
							text: newQuote,
							authorId: userSeeds.padawan.id,
						})
						.returning({
							text: quote.text,
							authorId: quote.authorId,
						});
				}),
			);
		});

		it("[before-drizzle-rls-support] conforms to RLS when using `set_config` in transaction", async () => {
			// Let's be closer to the real world and get user id from its auth session
			const session = await getUserAuthSession("yoda");
			const newQuote = "Always in motion is the future";
			const txConfig = {
				rlsConfig: {
					role: authenticated,
					set: [
						{
							name: "request.jwt.claims",
							value: JSON.stringify(
								jwtDecode(session.access_token),
							),
						},
					],
				},
			};

			const results = await db.transaction(async (tx) => {
				return tx
					.insert(quote)
					.values({ text: newQuote, authorId: session.user.id })
					.returning({
						text: quote.text,
						authorId: quote.authorId,
					});
			}, txConfig);

			assert.equal(results.length, 1);

			const [newUserQuote] = results;

			assert.equal(newUserQuote.authorId, session.user.id);
			assert.equal(newUserQuote.text, newQuote);

			// can't add a quote for another user
			await assert.rejects(
				db.transaction(async (tx) => {
					return tx
						.insert(quote)
						.values({
							text: newQuote,
							authorId: userSeeds.padawan.id,
						})
						.returning({
							text: quote.text,
							authorId: quote.authorId,
						});
				}, txConfig),
			);
		});

		it("bypass RLS when using transaction with no config", async () => {
			// Let's be closer to the real world and get user id from its auth session
			const session = await getUserAuthSession("yoda");
			const newQuote = "Always in motion is the future";

			const results = await db.transaction(async (tx) => {
				return tx
					.insert(quote)
					.values({ text: newQuote, authorId: session.user.id })
					.returning({
						text: quote.text,
						authorId: quote.authorId,
					});
			});

			assert.equal(results.length, 1);

			const [newUserQuote] = results;

			assert.equal(newUserQuote.authorId, session.user.id);
			assert.equal(newUserQuote.text, newQuote);

			// can update another user
			const otherUserResults = await db.transaction(async (tx) => {
				return tx
					.insert(quote)
					.values({ text: newQuote, authorId: userSeeds.padawan.id })
					.returning({
						text: quote.text,
						authorId: quote.authorId,
					});
			});

			assert.equal(otherUserResults.length, 1);

			const [otherUserNewQuote] = otherUserResults;

			assert.equal(otherUserNewQuote.authorId, userSeeds.padawan.id);
			assert.equal(otherUserNewQuote.text, newQuote);
		});

		it("bypass RLS when not using transaction", async () => {
			const session = await getUserAuthSession("yoda");
			const newQuote = "Always in motion is the future";

			const results = await db
				.insert(quote)
				.values({ text: newQuote, authorId: session.user.id })
				.returning({
					text: quote.text,
					authorId: quote.authorId,
				});

			assert.equal(results.length, 1);

			const [newUserQuote] = results;

			assert.equal(newUserQuote.authorId, session.user.id);
			assert.equal(newUserQuote.text, newQuote);
		});
	});

	describe("User can delete its quotes", () => {
		it("[before-drizzle-rls-support] conforms to RLS when using `set_config` in transaction", async () => {
			// Let's be closer to the real world and get user id from its auth session
			const session = await getUserAuthSession("yoda");

			const results = await db.transaction(async (tx) => {
				await tx.execute(
					sql`SELECT set_config('request.jwt.claims', '${sql.raw(
						JSON.stringify(jwtDecode(session.access_token)),
					)}', TRUE)`,
				);
				await tx.execute(sql`set local role authenticated`);

				return tx
					.delete(quote)
					.where(eq(quote.authorId, session.user.id))
					.returning({
						authorId: quote.authorId,
					});
			});

			assert.equal(results.length, 1);

			const [deletedQuote] = results;

			assert.equal(deletedQuote.authorId, session.user.id);

			// can't delete another user quote
			const otherUserResults = await db.transaction(async (tx) => {
				await tx.execute(
					sql`SELECT set_config('request.jwt.claims', '${sql.raw(
						JSON.stringify(jwtDecode(session.access_token)),
					)}', TRUE)`,
				);
				await tx.execute(sql`set local role authenticated`);

				return tx
					.delete(quote)
					.where(eq(quote.authorId, userSeeds.padawan.id))
					.returning({
						authorId: quote.authorId,
					});
			});

			assert.equal(otherUserResults.length, 0);
		});

		it("[drizzle-rls-support] conforms to RLS when using `set_config` in transaction", async () => {
			// Let's be closer to the real world and get user id from its auth session
			const session = await getUserAuthSession("yoda");
			const txConfig = {
				rlsConfig: {
					role: authenticated,
					set: [
						{
							name: "request.jwt.claims",
							value: JSON.stringify(
								jwtDecode(session.access_token),
							),
						},
					],
				},
			};

			const results = await db.transaction(async (tx) => {
				return tx
					.delete(quote)
					.where(eq(quote.authorId, session.user.id))
					.returning({
						authorId: quote.authorId,
					});
			}, txConfig);

			assert.equal(results.length, 1);

			const [deletedQuote] = results;

			assert.equal(deletedQuote.authorId, session.user.id);

			// can't delete another user quote
			const otherUserResults = await db.transaction(async (tx) => {
				return tx
					.delete(quote)
					.where(eq(quote.authorId, userSeeds.padawan.id))
					.returning({
						authorId: quote.authorId,
					});
			}, txConfig);

			assert.equal(otherUserResults.length, 0);
		});

		it("bypass RLS when using transaction with no config", async () => {
			// Let's be closer to the real world and get user id from its auth session
			const session = await getUserAuthSession("yoda");

			const results = await db.transaction(async (tx) => {
				return tx
					.delete(quote)
					.where(eq(quote.authorId, session.user.id))
					.returning({
						authorId: quote.authorId,
					});
			});

			assert.equal(results.length, 1);

			const [deletedQuote] = results;

			assert.equal(deletedQuote.authorId, session.user.id);

			// can update another user
			const otherUserResults = await db.transaction(async (tx) => {
				return tx
					.delete(quote)
					.where(eq(quote.authorId, userSeeds.padawan.id))
					.returning({
						id: quote.id,
						authorId: quote.authorId,
					});
			});

			assert.equal(otherUserResults.length, 1);

			const [otherUserDeletedQuote] = otherUserResults;

			assert.equal(otherUserDeletedQuote.authorId, userSeeds.padawan.id);
		});

		it("bypass RLS when not using transaction", async () => {
			const session = await getUserAuthSession("yoda");

			const results = await db
				.delete(quote)
				.where(eq(quote.authorId, session.user.id))
				.returning({
					authorId: quote.authorId,
				});

			assert.equal(results.length, 1);

			const [deletedQuote] = results;

			assert.equal(deletedQuote.authorId, session.user.id);
		});
	});
});

describe("faction table", () => {
	describe("User can only list users of the same faction", () => {
		it("[before-drizzle-rls-support] conforms to RLS when using `set_config` in transaction", async () => {
			// Let's be closer to the real world and get user id from its auth session
			const session = await getUserAuthSession("yoda");
			const factionName = userSeeds.yoda.faction;

			const results = await db.transaction(async (tx) => {
				await tx.execute(
					sql`SELECT set_config('request.jwt.claims', '${sql.raw(
						JSON.stringify(jwtDecode(session.access_token)),
					)}', TRUE)`,
				);
				// custom auth function used in the policy
				await tx.execute(
					sql`SELECT set_config('user.faction', '${sql.raw(
						factionName,
					)}', TRUE)`,
				);
				await tx.execute(sql`set local role authenticated`);

				return tx
					.select({ userId: faction.userId, name: faction.name })
					.from(faction);
			});

			assert.equal(results.length, 2);

			const factions = results.map((r) => r.userId);

			assert.ok(factions.includes(userSeeds.yoda.id));
			assert.ok(factions.includes(userSeeds.padawan.id));
		});

		it("[drizzle-rls-support] conforms to RLS when using `set_config` in transaction", async () => {
			// Let's be closer to the real world and get user id from its auth session
			const session = await getUserAuthSession("yoda");
			const factionName = userSeeds.yoda.faction;
			const txConfig = {
				rlsConfig: {
					role: authenticated,
					set: [
						{
							name: "request.jwt.claims",
							value: JSON.stringify(
								jwtDecode(session.access_token),
							),
						},
						{
							name: "user.faction",
							value: factionName,
						},
					],
				},
			};

			const results = await db.transaction(async (tx) => {
				return tx
					.select({ userId: faction.userId, name: faction.name })
					.from(faction);
			}, txConfig);

			assert.equal(results.length, 2);

			const factions = results.map((r) => r.userId);

			assert.ok(factions.includes(userSeeds.yoda.id));
			assert.ok(factions.includes(userSeeds.padawan.id));
		});

		it("bypass RLS when using transaction with no config", async () => {
			const results = await db.transaction(async (tx) => {
				return tx
					.select({ userId: faction.userId, name: faction.name })
					.from(faction);
			});

			assert.equal(results.length, 4);
		});

		it("bypass RLS when not using transaction", async () => {
			const results = await db
				.select({ userId: faction.userId, name: faction.name })
				.from(faction);

			assert.equal(results.length, 4);
		});
	});
});
