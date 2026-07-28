import { pgTable, text, serial, integer, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";
import { coursesTable } from "./courses";

export const attendanceTable = pgTable("attendance", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id")
    .notNull()
    .references(() => studentsTable.id),
  courseId: integer("course_id")
    .notNull()
    .references(() => coursesTable.id),
  date: date("date", { mode: "string" }).notNull(),
  status: text("status").notNull().default("present"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAttendanceSchema = createInsertSchema(attendanceTable).omit({
  id: true,
  createdAt: true,
});
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Attendance = typeof attendanceTable.$inferSelect;
