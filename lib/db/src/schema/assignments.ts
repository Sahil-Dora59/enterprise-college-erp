import { pgTable, text, serial, integer, timestamp, date, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { coursesTable } from "./courses";
import { facultyTable } from "./faculty";
import { studentsTable } from "./students";

export const assignmentsTable = pgTable("assignments", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  courseId: integer("course_id")
    .notNull()
    .references(() => coursesTable.id),
  facultyId: integer("faculty_id")
    .notNull()
    .references(() => facultyTable.id),
  dueDate: date("due_date", { mode: "string" }).notNull(),
  totalMarks: integer("total_marks").notNull().default(100),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const submissionsTable = pgTable("submissions", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id")
    .notNull()
    .references(() => assignmentsTable.id),
  studentId: integer("student_id")
    .notNull()
    .references(() => studentsTable.id),
  content: text("content"),
  fileUrl: text("file_url"),
  marksObtained: numeric("marks_obtained", { precision: 6, scale: 2 }),
  feedback: text("feedback"),
  status: text("status").notNull().default("submitted"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAssignmentSchema = createInsertSchema(assignmentsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertSubmissionSchema = createInsertSchema(submissionsTable).omit({
  id: true,
  createdAt: true,
  submittedAt: true,
});

export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type Assignment = typeof assignmentsTable.$inferSelect;
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Submission = typeof submissionsTable.$inferSelect;
