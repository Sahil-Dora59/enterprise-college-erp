import { pgTable, text, serial, integer, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { departmentsTable } from "./departments";
import { semestersTable } from "./semesters";

export const studentsTable = pgTable("students", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id)
    .unique(),
  rollNumber: text("roll_number").notNull().unique(),
  departmentId: integer("department_id")
    .notNull()
    .references(() => departmentsTable.id),
  semesterId: integer("semester_id")
    .notNull()
    .references(() => semestersTable.id),
  admissionDate: date("admission_date", { mode: "string" }).notNull(),
  dateOfBirth: date("date_of_birth", { mode: "string" }),
  address: text("address"),
  guardianName: text("guardian_name"),
  guardianPhone: text("guardian_phone"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertStudentSchema = createInsertSchema(studentsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof studentsTable.$inferSelect;
