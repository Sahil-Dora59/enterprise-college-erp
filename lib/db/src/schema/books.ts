import { pgTable, text, serial, integer, timestamp, numeric, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";

export const booksTable = pgTable("books", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  author: text("author"),
  isbn: text("isbn").notNull().unique(),
  category: text("category"),
  publisher: text("publisher"),
  publishedYear: integer("published_year"),
  totalCopies: integer("total_copies").notNull().default(1),
  availableCopies: integer("available_copies").notNull().default(1),
  description: text("description"),
  coverUrl: text("cover_url"),
  location: text("location"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const borrowRecordsTable = pgTable("borrow_records", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id")
    .notNull()
    .references(() => booksTable.id),
  studentId: integer("student_id")
    .notNull()
    .references(() => studentsTable.id),
  borrowDate: date("borrow_date", { mode: "string" }).notNull(),
  dueDate: date("due_date", { mode: "string" }),
  returnDate: date("return_date", { mode: "string" }),
  fine: numeric("fine", { precision: 10, scale: 2 }),
  status: text("status").notNull().default("borrowed"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBookSchema = createInsertSchema(booksTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertBorrowSchema = createInsertSchema(borrowRecordsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBook = z.infer<typeof insertBookSchema>;
export type Book = typeof booksTable.$inferSelect;
export type InsertBorrow = z.infer<typeof insertBorrowSchema>;
export type BorrowRecord = typeof borrowRecordsTable.$inferSelect;
