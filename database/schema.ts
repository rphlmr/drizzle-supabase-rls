import { sql, exists, and, eq, inArray } from "drizzle-orm";
import {
  bigint,
  foreignKey,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  pgSchema,
  pgPolicy,
  pgRole,
  bigserial,
} from "drizzle-orm/pg-core";
import {
  authenticatedRole,
  authUsers,
  realtimeMessages,
  realtimeTopic,
  supabaseAuthAdminRole,
} from "drizzle-orm/supabase";

/* ------------------------------ auth schema; ------------------------------ */
const auth = {
  schema: pgSchema("auth"),
  uid: () => "auth.uid()",
};

/* ------------------------------ realtime schema; ------------------------------ */
const realtime = {
  schema: pgSchema("realtime"),
  topic: () => "realtime.topic()",
};

/* ------------------------------ public schema; ------------------------------ */

export const rooms = pgTable(
  "rooms",
  {
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    topic: text().notNull(),
  },
  (table) => [
    unique("rooms_topic_key").on(table.topic),
    pgPolicy("authenticated can read rooms", {
      for: "select",
      to: authenticatedRole,
      using: sql`true`,
    }),
    pgPolicy("authenticated can add rooms", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`true`,
    }),
  ]
);

export type Room = typeof rooms.$inferSelect;

export const profiles = pgTable(
  "profiles",
  {
    id: uuid().primaryKey().notNull(),
    email: text().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.id],
      foreignColumns: [authUsers.id],
      name: "profiles_id_fk",
    }).onDelete("cascade"),
    pgPolicy("authenticated can view all profiles", {
      for: "select",
      to: authenticatedRole,
      using: sql`true`,
    }),
    pgPolicy("supabase_auth_admin can insert profile", {
      for: "insert",
      to: supabaseAuthAdminRole,
      withCheck: sql`true`,
    }),
  ]
);

export const roomsUsers = pgTable(
  "rooms_users",
  {
    userId: uuid().notNull(),
    roomTopic: text().notNull(),
    joinedAt: timestamp({
      mode: "string",
      precision: 3,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [authUsers.id],
      name: "rooms_users_user_id_fk",
    }),
    foreignKey({
      columns: [table.roomTopic],
      foreignColumns: [rooms.topic],
      name: "rooms_users_room_topic_fk",
    }),
    pgPolicy("authenticated can read rooms_users", {
      for: "select",
      to: authenticatedRole,
      using: sql`true`,
    }),
    pgPolicy("authenticated can add rooms_users", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`true`,
    }),
  ]
);

export const P1 = pgPolicy(
  "authenticated can read broadcast and presence state",
  {
    for: "select",
    to: authenticatedRole,
    using: exists(
      sql`(
      select 1 from ${roomsUsers} where 
      ${and(
        eq(roomsUsers.userId, sql.raw(`(select ${auth.uid()})`)),
        eq(roomsUsers.roomTopic, sql.raw(realtime.topic())),
        inArray(realtimeMessages.extension, [
          "presence",
          "broadcast",
        ]).inlineParams()
      )}
    )`
    ),
  }
).link(realtimeMessages);

export const P2 = pgPolicy(
  "authenticated can send broadcast and track presence",
  {
    for: "insert",
    to: authenticatedRole,
    withCheck: exists(
      sql`(
      select 1 from ${roomsUsers} where 
      ${and(
        eq(roomsUsers.userId, sql.raw(auth.uid())),
        eq(roomsUsers.roomTopic, sql.raw(realtime.topic())),
        inArray(realtimeMessages.extension, [
          "presence",
          "broadcast",
        ]).inlineParams()
      )}
    )`
    ),
  }
).link(realtimeMessages);
