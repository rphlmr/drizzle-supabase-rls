import SupabaseLogo from "@/components/SupabaseLogo";
import AuthButton from "../components/AuthButton";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { createDrizzleSupabaseRLSClient } from "@/database/db";

export default async function Index() {
  const db = await createDrizzleSupabaseRLSClient();
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("Admin query", await db.admin.query.rooms.findMany());

  try {
    console.log("Invalid RLS query", await db.rls.query.rooms.findMany());
  } catch (error) {
    // requires to use a transaction
    console.error(error);
  }

  console.log(
    "Valid RLS query",
    await db.rls.transaction(async (tx) => {
      return tx.query.rooms.findMany();
    })
  );

  return (
    <main className="flex flex-col gap-6 items-center h-full mt-40">
      <h2 className="flex items-center gap-6">
        <SupabaseLogo />
      </h2>
      {user ? (
        <Link
          href="/protected"
          className="py-2 px-3 flex rounded-md no-underline bg-btn-background hover:bg-btn-background-hover"
        >
          Chat
        </Link>
      ) : (
        <AuthButton />
      )}
    </main>
  );
}
