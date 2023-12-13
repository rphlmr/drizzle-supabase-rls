import { userSeeds, type UserName } from "./db/data-seeds";
import { getSupabaseAdmin } from "./lib/supabase";

export async function getUserAuthSession(userName: UserName) {
	const { email, password } = userSeeds[userName];
	const {
		data: { session },
	} = await getSupabaseAdmin().auth.signInWithPassword({
		email,
		password,
	});

	if (!session) {
		throw new Error(`No session found for user ${userName}`);
	}

	return session;
}
