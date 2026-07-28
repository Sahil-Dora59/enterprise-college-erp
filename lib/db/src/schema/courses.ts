import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { departmentsTable } from "./departments";
import { semestersTable } from "./semesters";

export const coursesTable = pgTable("courses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  credits: integer("credits").notNull().default(3),
  departmentId: integer("department_id")
    .notNull()
    .references(() => departmentsTable.id),
  semesterId: integer("semester_id")
    .notNull()
    .references(() => semestersTable.id),
  facultyId: integer("faculty_id"),
  description: text("description"),
  maxStudents: integer("max_students"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCourseSchema = createInsertSchema(coursesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Course = typeof coursesTable.$inferSelect;
