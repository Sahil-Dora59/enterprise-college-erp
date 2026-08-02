import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, booksTable, borrowRecordsTable, feeRecordsTable, facultyTable, studentsTable, usersTable } from "@workspace/db";
import { authenticate } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/administration/summary", authenticate, async (_req, res): Promise<void> => {
  const [
    [{ students }],
    [{ faculty }],
    [{ fees }],
    [{ collected }],
    [{ outstanding }],
    [{ books }],
    [{ activeBorrows }],
    [{ overdueBorrows }],
  ] = await Promise.all([
    db.select({ students: sql<number>`count(*)::int` }).from(studentsTable),
    db.select({ faculty: sql<number>`count(*)::int` }).from(facultyTable),
    db.select({ fees: sql<number>`count(*)::int` }).from(feeRecordsTable),
    db.select({ collected: sql<number>`coalesce(sum(${feeRecordsTable.paidAmount}::numeric), 0)::float` }).from(feeRecordsTable),
    db.select({ outstanding: sql<number>`coalesce(sum(${feeRecordsTable.amount}::numeric - coalesce(${feeRecordsTable.paidAmount}::numeric, 0)), 0)::float` }).from(feeRecordsTable).where(sql`${feeRecordsTable.status} != 'paid'`),
    db.select({ books: sql<number>`count(*)::int` }).from(booksTable),
    db.select({ activeBorrows: sql<number>`count(*)::int` }).from(borrowRecordsTable).where(eq(borrowRecordsTable.status, "borrowed")),
    db.select({ overdueBorrows: sql<number>`count(*)::int` }).from(borrowRecordsTable).where(eq(borrowRecordsTable.status, "overdue")),
  ]);
  res.json({
    finance: { feeRecords: fees, collected, outstanding },
    library: { books, activeBorrows, overdueBorrows },
    people: { students, faculty },
    readiness: { payroll: false, hostel: false, transport: false, inventory: false },
  });
});

export default router;