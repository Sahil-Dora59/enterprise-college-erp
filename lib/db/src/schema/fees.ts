import { pgTable, text, serial, integer, timestamp, date, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";
import { semestersTable } from "./semesters";

export const feeRecordsTable = pgTable("fee_records", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id")
    .notNull()
    .references(() => studentsTable.id),
  semesterId: integer("semester_id")
    .notNull()
    .references(() => semestersTable.id),
  feeType: text("fee_type").notNull().default("tuition"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paidAmount: numeric("paid_amount", { precision: 12, scale: 2 }),
  dueDate: date("due_date", { mode: "string" }).notNull(),
  paidDate: date("paid_date", { mode: "string" }),
  status: text("status").notNull().default("pending"),
  transactionId: text("transaction_id"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertFeeRecordSchema = createInsertSchema(feeRecordsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertFeeRecord = z.infer<typeof insertFeeRecordSchema>;
export type FeeRecord = typeof feeRecordsTable.$inferSelect;
