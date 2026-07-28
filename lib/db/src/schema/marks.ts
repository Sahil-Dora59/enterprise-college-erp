import { pgTable, text, serial, integer, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";
import { examinationsTable } from "./examinations";

export const marksTable = pgTable("marks", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id")
    .notNull()
    .references(() => studentsTable.id),
  examinationId: integer("examination_id")
    .notNull()
    .references(() => examinationsTable.id),
  marksObtained: numeric("marks_obtained", { precision: 6, scale: 2 }).notNull(),
  grade: text("grade"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMarkSchema = createInsertSchema(marksTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMark = z.infer<typeof insertMarkSchema>;
export type Mark = typeof marksTable.$inferSelect;
