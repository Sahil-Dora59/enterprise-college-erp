import { pgTable, text, serial, integer, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { departmentsTable } from "./departments";

export const facultyTable = pgTable("faculty", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id)
    .unique(),
  employeeId: text("employee_id").notNull().unique(),
  departmentId: integer("department_id")
    .notNull()
    .references(() => departmentsTable.id),
  designation: text("designation").notNull(),
  qualification: text("qualification"),
  specialization: text("specialization"),
  joiningDate: date("joining_date", { mode: "string" }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertFacultySchema = createInsertSchema(facultyTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertFaculty = z.infer<typeof insertFacultySchema>;
export type Faculty = typeof facultyTable.$inferSelect;
