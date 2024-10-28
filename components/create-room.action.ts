"use server";

import { createDrizzleSupabaseRLSClient } from "@/database/db";
import { rooms, roomsUsers } from "@/database/schema";
import { createClient } from "@/utils/supabase/server";

export const createRoom = async (formData: FormData) => {
  const supabase = createClient();
  const user = await supabase.auth.getUser();
  const token = (await supabase.auth.getSession()).data.session!.access_token;
  const topic = formData.get("topic") as string;
  const db = await createDrizzleSupabaseRLSClient();

  try {
    await db.rls.transaction(async (tx) => {
      await tx.insert(rooms).values({
        topic,
      });

      await tx.insert(roomsUsers).values({
        userId: user.data.user!.id,
        roomTopic: topic,
      });
    });
  } catch (error) {
    console.error(error);
    return null;
  }

  supabase.realtime.setAuth(token);

  supabase.realtime.channel("supaslack").send({
    type: "broadcast",
    event: "new_room",
    payload: {},
  });
};
