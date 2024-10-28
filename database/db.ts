import { createClient } from "@/utils/supabase/server";
import { createDrizzle } from "./drizzle";

// https://github.com/orgs/supabase/discussions/23224
// Should be secure because we use the access token that is signed, and not the data read directly from the storage
export async function createDrizzleSupabaseClient() {
  const {
    data: { session },
  } = await createClient().auth.getSession();
  return createDrizzle(session?.access_token ?? "");
}
