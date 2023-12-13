/**
 * Here we define 2 functions to generate Supabase Clients
 * One is an Admin Client, the other one is a Client relying on RLS (where we will attach a user auth session)
 * We need that to make sure our tests will run with a fresh client and not collapse with a previous auth session
 */

import { createClient } from "@supabase/supabase-js";

function createSupabaseClient(supabaseKey: string) {
	return createClient(process.env.SUPABASE_API_URL, supabaseKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	});
}

/**
 * Provides a Supabase Admin Client with full admin privileges
 */
function getSupabaseAdmin() {
	return createSupabaseClient(process.env.SUPABASE_SERVICE_KEY);
}

/**
 * Provides a Supabase Client relying on RLS
 */
function getSupabaseClient() {
	return createSupabaseClient(process.env.SUPABASE_ANON_KEY);
}

export { getSupabaseAdmin, getSupabaseClient };
