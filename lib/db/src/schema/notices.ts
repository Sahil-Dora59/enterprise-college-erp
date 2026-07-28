import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const noticesTable = pgTable("notices", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  priority: text("priority").notNull().default("medium"),
  targetRole: text("target_role").notNull().default("all"),
  authorId: integer("author_id").references(() => usersTable.id),
  attachmentUrl: text("attachment_url"),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertNoticeSchema = createInsertSchema(noticesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertNotice = z.infer<typeof insertNoticeSchema>;
export type Notice = typeof noticesTable.$inferSelect;
