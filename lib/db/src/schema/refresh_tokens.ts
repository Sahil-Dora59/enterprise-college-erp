import { pgTable, serial, integer, text, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { authSessionsTable } from "./auth_sessions";

export const refreshTokensTable = pgTable("refresh_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  sessionId: integer("session_id").notNull().references(() => authSessionsTable.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  rememberMe: boolean("remember_me").notNull().default(false),
}, (table) => ({
  userActiveIndex: index("refresh_tokens_user_active_idx").on(table.userId, table.revokedAt, table.expiresAt),
  sessionActiveIndex: index("refresh_tokens_session_active_idx").on(table.sessionId, table.revokedAt),
}));

export type RefreshToken = typeof refreshTokensTable.$inferSelect;