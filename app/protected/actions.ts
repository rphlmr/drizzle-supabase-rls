"use server";

import { createDrizzleSupabaseClient } from "@/database/db";
import { profiles, Room, rooms, roomsUsers } from "@/database/schema";
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
