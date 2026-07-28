import { pgTable, text, serial, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const semestersTable = pgTable("semesters", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  startDate: date("start_date", { mode: "string" }).notNull(),
  endDate: date("end_date", { mode: "string" }).notNull(),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSemesterSchema = createInsertSchema(semestersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSemester = z.infer<typeof insertSemesterSchema>;
export type Semester = typeof semestersTable.$inferSelect;
