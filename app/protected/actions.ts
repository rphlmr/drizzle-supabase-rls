"use server";

import { createDrizzleSupabaseClient } from "@/database/db";
import { profiles, Room, rooms, roomsUsers } from "@/database/schema";
import { createClient } from "@/utils/supabase/server";
import { eq } from "drizzle-orm";

export const addUserToChannel = async (
  selectedRoom: Room["topic"],
  email: string
) => {
  const db = await createDrizzleSupabaseClient();

  const [user] = await db.rls((tx) =>
    tx.select().from(profiles).where(eq(profiles.email, email))
  );

  if (!user) {
    return `User ${email} not found`;
  } else {
    return await db.rls(async (tx) => {
      const [room] = await tx
        .select()
        .from(rooms)
        .where(eq(rooms.topic, selectedRoom))
        .limit(1);

      if (!room) {
        return `Room ${room} not found`;
      }

      await tx.insert(roomsUsers).values({
        userId: user.id,
        roomTopic: room.topic,
      });

      return `Added ${email} to channel ${selectedRoom}`;
    });
  }
};

export const createRoom = async (formData: FormData) => {
  const supabase = createClient();
  const user = await supabase.auth.getUser();
  const token = (await supabase.auth.getSession()).data.session!.access_token;
  const topic = formData.get("topic") as string;
  const db = await createDrizzleSupabaseClient();

  try {
    await db.rls(async (tx) => {
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
