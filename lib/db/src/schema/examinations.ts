import { pgTable, text, serial, integer, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { coursesTable } from "./courses";
import { semestersTable } from "./semesters";

export const examinationsTable = pgTable("examinations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  courseId: integer("course_id")
    .notNull()
    .references(() => coursesTable.id),
  semesterId: integer("semester_id")
    .notNull()
    .references(() => semestersTable.id),
  type: text("type").notNull().default("midterm"),
  examDate: date("exam_date", { mode: "string" }).notNull(),
  startTime: text("start_time"),
  endTime: text("end_time"),
  totalMarks: integer("total_marks").notNull().default(100),
  passingMarks: integer("passing_marks").notNull().default(40),
  venue: text("venue"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertExaminationSchema = createInsertSchema(examinationsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertExamination = z.infer<typeof insertExaminationSchema>;
export type Examination = typeof examinationsTable.$inferSelect;
