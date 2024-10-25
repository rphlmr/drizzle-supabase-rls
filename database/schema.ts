import {
  bigint,
  foreignKey,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  pgSchema,
} from "drizzle-orm/pg-core";

// Supabase Auth
const auth = pgSchema("auth");
const users = auth.table("users", {
  id: uuid().primaryKey().notNull(),
});

export const rooms = pgTable(
  "rooms",
  {
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    topic: text().notNull(),
  },
  (table) => [unique("rooms_topic_key").on(table.topic)]
).enableRLS();

export const profiles = pgTable(
  "profiles",
  {
    id: uuid().primaryKey().notNull(),
    email: text().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.id],
      foreignColumns: [users.id],
      name: "profiles_id_fk",
    }).onDelete("cascade"),
  ]
).enableRLS();

export const rooms_users = pgTable(
  "rooms_users",
  {
    user_id: uuid(),
    room_topic: text(),
    created_at: timestamp("joined_at", {
      mode: "string",
      precision: 3,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.user_id],
      foreignColumns: [users.id],
      name: "rooms_users_user_id_fk",
    }),
    foreignKey({
      columns: [table.room_topic],
      foreignColumns: [rooms.topic],
      name: "rooms_users_room_topic_fk",
    }),
  ]
).enableRLS();
