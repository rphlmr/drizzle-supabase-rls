import { createDrizzleSupabaseClient } from "@/database/db";
import { rooms } from "@/database/schema";
import { cache } from "react";
import Chat from "./component";

const getRooms = cache(async () => {
  const db = await createDrizzleSupabaseClient();
  return db.rls((tx) => tx.select().from(rooms));
});

export default async function Page() {
  const rooms = await getRooms();
  return <Chat rooms={rooms} />;
}
