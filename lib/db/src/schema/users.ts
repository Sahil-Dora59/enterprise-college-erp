import { pgTable, text, serial, boolean, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("student"),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  isActive: boolean("is_active").notNull().default(true),
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  emailVerified: boolean("email_verified").notNull().default(false),
  phoneVerified: boolean("phone_verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});
export const parentStudentLinksTable = pgTable("parent_student_links", {
  id: serial("id").primaryKey(),
  parentUserId: integer("parent_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  studentUserId: integer("student_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  relationship: text("relationship").notNull().default("parent"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  parentStatusIndex: index("parent_links_parent_status_idx").on(table.parentUserId, table.status),
  studentStatusIndex: index("parent_links_student_status_idx").on(table.studentUserId, table.status),
}));
export const parentMessagesTable = pgTable("parent_messages", {
  id: serial("id").primaryKey(), parentUserId: integer("parent_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  studentUserId: integer("student_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  recipientUserId: integer("recipient_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  body: text("body").notNull(), category: text("category").notNull().default("faculty"),
  status: text("status").notNull().default("unread"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  parentCreatedIndex: index("parent_messages_parent_created_idx").on(table.parentUserId, table.createdAt),
  recipientStatusIndex: index("parent_messages_recipient_status_idx").on(table.recipientUserId, table.status),
}));
export const parentAppointmentsTable = pgTable("parent_appointments", {
  id: serial("id").primaryKey(), parentUserId: integer("parent_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  studentUserId: integer("student_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  recipientUserId: integer("recipient_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(), purpose: text("purpose").notNull(),
  status: text("status").notNull().default("requested"), notes: text("notes"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  parentScheduleIndex: index("parent_appointments_parent_schedule_idx").on(table.parentUserId, table.scheduledAt),
  recipientStatusIndex: index("parent_appointments_recipient_status_idx").on(table.recipientUserId, table.status),
}));
export const parentLeaveRequestsTable = pgTable("parent_leave_requests", {
  id: serial("id").primaryKey(), parentUserId: integer("parent_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  studentUserId: integer("student_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  fromDate: timestamp("from_date", { withTimezone: true }).notNull(), toDate: timestamp("to_date", { withTimezone: true }).notNull(),
  reason: text("reason").notNull(), status: text("status").notNull().default("pending"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  parentStatusIndex: index("parent_leave_parent_status_idx").on(table.parentUserId, table.status),
  studentStatusIndex: index("parent_leave_student_status_idx").on(table.studentUserId, table.status),
}));
export const parentNotificationsTable = pgTable("parent_notifications", {
  id: serial("id").primaryKey(), parentUserId: integer("parent_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  category: text("category").notNull().default("general"), priority: text("priority").notNull().default("normal"),
  title: text("title").notNull(), body: text("body").notNull(), status: text("status").notNull().default("unread"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  parentStatusCreatedIndex: index("parent_notifications_parent_status_created_idx").on(table.parentUserId, table.status, table.createdAt),
}));

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
