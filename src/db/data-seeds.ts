import { db } from ".";
import { faction, quote, user } from "./schema";

export const userSeeds = {
	yoda: {
		id: "81e599f6-4b76-49ef-af28-283e6aa03e6f",
		email: "yoda@drizzle.com",
		password: "Feel the force!",
		name: "Yoda",
		mainQuote: "Do or do not, there is no try.",
		faction: "republic",
	},
	padawan: {
		id: "c06d3def-d2c2-47a3-8ca7-2c4758a53abf",
		email: "padawan@drizzle.com",
		password: "For the Republic!",
		name: "Padawan",
		mainQuote: "May the force be with you.",
		faction: "republic",
	},
	vader: {
		id: "cf3ebe8f-d517-4b3f-8f9c-1d428f886709",
		email: "vader@drizzle.com",
		password: "NO ... I AM YOUR FATHER!",
		name: "Vader",
		mainQuote: "I find your lack of faith disturbing.",
		faction: "empire",
	},
	stormtrooper: {
		id: "c00b4f2d-4d29-4085-bbfa-4f6280dedea8",
		email: "stormtrooper@drizzle.com",
		password: "For the Empire!",
		name: "Stormtrooper",
		mainQuote: "Move along, move along.",
		faction: "empire",
	},
} as const;

export type UserName = keyof typeof userSeeds;

export async function seed() {
	await db.transaction(async (tx) => {
		await tx.insert(user).values(
			Object.values(userSeeds).map((user) => ({
				id: user.id,
				name: user.name,
			})),
		);

		const quotesSeed = tx.insert(quote).values(
			Object.values(userSeeds).map((user) => ({
				authorId: user.id,
				text: user.mainQuote,
			})),
		);

		const factionsSeed = tx.insert(faction).values(
			Object.values(userSeeds).map((user) => ({
				userId: user.id,
				name: user.faction,
			})),
		);

		await Promise.all([quotesSeed, factionsSeed]);
	});
}
