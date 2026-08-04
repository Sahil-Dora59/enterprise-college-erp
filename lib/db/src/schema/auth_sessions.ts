import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const authSessionsTable = pgTable("auth_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  tokenId: text("token_id").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
}, (table) => ({
  userExpiryIndex: index("auth_sessions_user_expiry_idx").on(table.userId, table.expiresAt),
  activeTokenIndex: index("auth_sessions_token_active_idx").on(table.tokenId, table.revokedAt),
}));

export type AuthSession = typeof authSessionsTable.$inferSelect;