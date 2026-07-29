import { Router, type IRouter } from "express";
import { eq, and, ilike, sql } from "drizzle-orm";
import { db, booksTable, borrowRecordsTable, studentsTable, usersTable } from "@workspace/db";
import { ListBooksQueryParams, CreateBookBody, GetBookParams, UpdateBookParams, UpdateBookBody, DeleteBookParams, ListBorrowsQueryParams, BorrowBookBody, ReturnBookParams } from "@workspace/api-zod";
import { authenticate } from "../middlewares/auth";
import { getStudentIdForUser } from "../lib/rbac";

const router: IRouter = Router();

function fmtBook(b: typeof booksTable.$inferSelect) {
  return { ...b, createdAt: b.createdAt.toISOString() };
}

router.get("/library/books", authenticate, async (req, res): Promise<void> => {
  const parsed = ListBooksQueryParams.safeParse(req.query);
  const { search, category, available, page = 1, limit = 20 } = parsed.data ?? {};
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const offset = (pageNum - 1) * limitNum;

  const conditions: ReturnType<typeof eq>[] = [];
  if (category) conditions.push(eq(booksTable.category, category as string));
  if (search) conditions.push(ilike(booksTable.title, `%${search}%`));
  if (available === true || available === "true" as unknown) conditions.push(sql`${booksTable.availableCopies} > 0` as ReturnType<typeof eq>);

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, [{ total }]] = await Promise.all([
    db.select().from(booksTable).where(where).limit(limitNum).offset(offset),
    db.select({ total: sql<number>`count(*)::int` }).from(booksTable).where(where),
  ]);

  res.json({ data: data.map(fmtBook), total, page: pageNum, limit: limitNum });
});

router.post("/library/books", authenticate, async (req, res): Promise<void> => {
  const parsed = CreateBookBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { totalCopies = 1, ...rest } = parsed.data;
  const [book] = await db.insert(booksTable).values({ ...rest, totalCopies, availableCopies: totalCopies }).returning();
  res.status(201).json(fmtBook(book));
});

router.get("/library/books/:id", authenticate, async (req, res): Promise<void> => {
  const params = GetBookParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, params.data.id));
  if (!book) { res.status(404).json({ error: "Book not found" }); return; }
  res.json(fmtBook(book));
});

router.patch("/library/books/:id", authenticate, async (req, res): Promise<void> => {
  const params = UpdateBookParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateBookBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [book] = await db.update(booksTable).set(parsed.data).where(eq(booksTable.id, params.data.id)).returning();
  if (!book) { res.status(404).json({ error: "Book not found" }); return; }
  res.json(fmtBook(book));
});

router.delete("/library/books/:id", authenticate, async (req, res): Promise<void> => {
  const params = DeleteBookParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [b] = await db.delete(booksTable).where(eq(booksTable.id, params.data.id)).returning();
  if (!b) { res.status(404).json({ error: "Book not found" }); return; }
  res.sendStatus(204);
});

router.get("/library/borrows", authenticate, async (req, res): Promise<void> => {
  const parsed = ListBorrowsQueryParams.safeParse(req.query);
  const { studentId, status } = parsed.data ?? {};

  const conditions: ReturnType<typeof eq>[] = [];
  if (req.user?.role === "student") {
    const ownStudentId = await getStudentIdForUser(req.user.userId);
    if (!ownStudentId) { res.status(403).json({ error: "Student profile not found" }); return; }
    conditions.push(eq(borrowRecordsTable.studentId, ownStudentId));
  }
  if (studentId) conditions.push(eq(borrowRecordsTable.studentId, Number(studentId)));
  if (status) conditions.push(eq(borrowRecordsTable.status, status as string));

  const rows = await db
    .select({
      id: borrowRecordsTable.id,
      bookId: borrowRecordsTable.bookId,
      studentId: borrowRecordsTable.studentId,
      borrowDate: borrowRecordsTable.borrowDate,
      dueDate: borrowRecordsTable.dueDate,
      returnDate: borrowRecordsTable.returnDate,
      fine: borrowRecordsTable.fine,
      status: borrowRecordsTable.status,
      createdAt: borrowRecordsTable.createdAt,
      bookTitle: booksTable.title,
      bookIsbn: booksTable.isbn,
      studentName: usersTable.name,
      rollNumber: studentsTable.rollNumber,
    })
    .from(borrowRecordsTable)
    .leftJoin(booksTable, eq(borrowRecordsTable.bookId, booksTable.id))
    .leftJoin(studentsTable, eq(borrowRecordsTable.studentId, studentsTable.id))
    .leftJoin(usersTable, eq(studentsTable.userId, usersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  res.json(rows.map((r) => ({ ...r, fine: r.fine ? Number(r.fine) : null, createdAt: r.createdAt.toISOString() })));
});

router.post("/library/borrows", authenticate, async (req, res): Promise<void> => {
  const parsed = BorrowBookBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  if (req.user?.role === "student") {
    const ownStudentId = await getStudentIdForUser(req.user.userId);
    if (!ownStudentId || parsed.data.studentId !== ownStudentId) {
      res.status(403).json({ error: "Students can only borrow books for their own account" });
      return;
    }
  }

  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, parsed.data.bookId));
  if (!book) { res.status(404).json({ error: "Book not found" }); return; }
  if (book.availableCopies <= 0) { res.status(400).json({ error: "No copies available" }); return; }

  const [record] = await db.transaction(async (tx) => {
    await tx.update(booksTable).set({ availableCopies: book.availableCopies - 1 }).where(eq(booksTable.id, book.id));
    return tx.insert(borrowRecordsTable).values(parsed.data).returning();
  });

  res.status(201).json({ ...record, fine: record.fine ? Number(record.fine) : null, createdAt: record.createdAt.toISOString() });
});

router.post("/library/borrows/:id/return", authenticate, async (req, res): Promise<void> => {
  const params = ReturnBookParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [borrow] = await db.select().from(borrowRecordsTable).where(eq(borrowRecordsTable.id, params.data.id));
  if (!borrow) { res.status(404).json({ error: "Borrow record not found" }); return; }
  if (borrow.status === "returned") { res.status(400).json({ error: "Book already returned" }); return; }

  const today = new Date().toISOString().split("T")[0];
  const record = await db.transaction(async (tx) => {
    await tx.update(booksTable).set({ availableCopies: sql`${booksTable.availableCopies} + 1` }).where(eq(booksTable.id, borrow.bookId));
    const [updated] = await tx.update(borrowRecordsTable).set({ status: "returned", returnDate: today }).where(eq(borrowRecordsTable.id, params.data.id)).returning();
    return updated;
  });

  res.json({ ...record, fine: record.fine ? Number(record.fine) : null, createdAt: record.createdAt.toISOString() });
});

export default router;
