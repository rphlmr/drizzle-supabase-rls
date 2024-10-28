import { createClient } from "@/utils/supabase/server";
import { createDrizzleRLSClient } from "./drizzle";

// https://github.com/orgs/supabase/discussions/23224
// Should be secure because we use the access token that is signed, and not the data read directly from the storage
export async function createDrizzleSupabaseRLSClient() {
  const {
    data: { session },
  } = await createClient().auth.getSession();
  return createDrizzleRLSClient(session?.access_token ?? "");
}
