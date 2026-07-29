import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, feeRecordsTable, studentsTable, usersTable, semestersTable } from "@workspace/db";
import { ListFeesQueryParams, CreateFeeRecordBody, GetFeeRecordParams, UpdateFeeRecordParams, UpdateFeeRecordBody, PayFeeParams, PayFeeBody, GetFeeSummaryQueryParams } from "@workspace/api-zod";
import { authenticate } from "../middlewares/auth";
import { getStudentIdForUser } from "../lib/rbac";

const router: IRouter = Router();

type FeeView = Omit<typeof feeRecordsTable.$inferSelect, "updatedAt"> & { studentName?: string | null; rollNumber?: string | null; semesterName?: string | null };

function fmtFee(r: FeeView) {
  return { ...r, amount: Number(r.amount), paidAmount: r.paidAmount ? Number(r.paidAmount) : null, createdAt: r.createdAt.toISOString() };
}

async function getFeeWithDetails(id: number) {
  const [row] = await db
    .select({
      id: feeRecordsTable.id,
      studentId: feeRecordsTable.studentId,
      semesterId: feeRecordsTable.semesterId,
      feeType: feeRecordsTable.feeType,
      amount: feeRecordsTable.amount,
      paidAmount: feeRecordsTable.paidAmount,
      dueDate: feeRecordsTable.dueDate,
      paidDate: feeRecordsTable.paidDate,
      status: feeRecordsTable.status,
      transactionId: feeRecordsTable.transactionId,
      remarks: feeRecordsTable.remarks,
      createdAt: feeRecordsTable.createdAt,
      studentName: usersTable.name,
      rollNumber: studentsTable.rollNumber,
      semesterName: semestersTable.name,
    })
    .from(feeRecordsTable)
    .leftJoin(studentsTable, eq(feeRecordsTable.studentId, studentsTable.id))
    .leftJoin(usersTable, eq(studentsTable.userId, usersTable.id))
    .leftJoin(semestersTable, eq(feeRecordsTable.semesterId, semestersTable.id))
    .where(eq(feeRecordsTable.id, id));
  if (!row) return null;
  return fmtFee(row);
}

router.get("/fees", authenticate, async (req, res): Promise<void> => {
  const parsed = ListFeesQueryParams.safeParse(req.query);
  const { studentId, status, semesterId, page = 1, limit = 20 } = parsed.data ?? {};
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const offset = (pageNum - 1) * limitNum;

  const conditions: ReturnType<typeof eq>[] = [];
  if (req.user?.role === "student") {
    const ownStudentId = await getStudentIdForUser(req.user.userId);
    if (!ownStudentId) { res.status(403).json({ error: "Student profile not found" }); return; }
    conditions.push(eq(feeRecordsTable.studentId, ownStudentId));
  }
  if (studentId) conditions.push(eq(feeRecordsTable.studentId, Number(studentId)));
  if (status) conditions.push(eq(feeRecordsTable.status, status as string));
  if (semesterId) conditions.push(eq(feeRecordsTable.semesterId, Number(semesterId)));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, [{ total }]] = await Promise.all([
    db.select({
      id: feeRecordsTable.id,
      studentId: feeRecordsTable.studentId,
      semesterId: feeRecordsTable.semesterId,
      feeType: feeRecordsTable.feeType,
      amount: feeRecordsTable.amount,
      paidAmount: feeRecordsTable.paidAmount,
      dueDate: feeRecordsTable.dueDate,
      paidDate: feeRecordsTable.paidDate,
      status: feeRecordsTable.status,
      transactionId: feeRecordsTable.transactionId,
      remarks: feeRecordsTable.remarks,
      createdAt: feeRecordsTable.createdAt,
      studentName: usersTable.name,
      rollNumber: studentsTable.rollNumber,
      semesterName: semestersTable.name,
    })
    .from(feeRecordsTable)
    .leftJoin(studentsTable, eq(feeRecordsTable.studentId, studentsTable.id))
    .leftJoin(usersTable, eq(studentsTable.userId, usersTable.id))
    .leftJoin(semestersTable, eq(feeRecordsTable.semesterId, semestersTable.id))
    .where(where)
    .limit(limitNum).offset(offset),
    db.select({ total: sql<number>`count(*)::int` }).from(feeRecordsTable).where(where),
  ]);

  res.json({ data: data.map(fmtFee), total, page: pageNum, limit: limitNum });
});

router.post("/fees", authenticate, async (req, res): Promise<void> => {
  const parsed = CreateFeeRecordBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [fee] = await db.insert(feeRecordsTable).values({ ...parsed.data, amount: String(parsed.data.amount) }).returning();
  const full = await getFeeWithDetails(fee.id);
  res.status(201).json(full);
});

router.get("/fees/summary", authenticate, async (req, res): Promise<void> => {
  const parsed = GetFeeSummaryQueryParams.safeParse(req.query);
  const { semesterId } = parsed.data ?? {};

  let where: ReturnType<typeof eq> | undefined = semesterId ? eq(feeRecordsTable.semesterId, Number(semesterId)) : undefined;
  if (req.user?.role === "student") {
    const ownStudentId = await getStudentIdForUser(req.user.userId);
    if (!ownStudentId) { res.status(403).json({ error: "Student profile not found" }); return; }
    where = where ? and(where, eq(feeRecordsTable.studentId, ownStudentId)) : eq(feeRecordsTable.studentId, ownStudentId);
  }

  const [agg] = await db.select({
    totalDue: sql<number>`coalesce(sum(${feeRecordsTable.amount}::numeric), 0)::float`,
    totalCollected: sql<number>`coalesce(sum(${feeRecordsTable.paidAmount}::numeric), 0)::float`,
    totalPending: sql<number>`coalesce(sum(case when ${feeRecordsTable.status} = 'pending' then ${feeRecordsTable.amount}::numeric else 0 end), 0)::float`,
    totalOverdue: sql<number>`coalesce(sum(case when ${feeRecordsTable.status} = 'overdue' then ${feeRecordsTable.amount}::numeric else 0 end), 0)::float`,
  }).from(feeRecordsTable).where(where);

  const totalDue = agg?.totalDue ?? 0;
  const totalCollected = agg?.totalCollected ?? 0;
  const collectionRate = totalDue > 0 ? Math.round((totalCollected / totalDue) * 100 * 10) / 10 : 0;

  res.json({ totalDue, totalCollected, totalPending: agg?.totalPending ?? 0, totalOverdue: agg?.totalOverdue ?? 0, collectionRate });
});

router.get("/fees/:id", authenticate, async (req, res): Promise<void> => {
  const params = GetFeeRecordParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const full = await getFeeWithDetails(params.data.id);
  if (!full) { res.status(404).json({ error: "Fee record not found" }); return; }
  if (req.user?.role === "student") {
    const ownStudentId = await getStudentIdForUser(req.user.userId);
    if (full.studentId !== ownStudentId) { res.status(404).json({ error: "Fee record not found" }); return; }
  }
  res.json(full);
});

router.patch("/fees/:id", authenticate, async (req, res): Promise<void> => {
  const params = UpdateFeeRecordParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateFeeRecordBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const updateData = {
    ...parsed.data,
    ...(parsed.data.amount !== undefined && { amount: String(parsed.data.amount) }),
  } as Partial<typeof feeRecordsTable.$inferInsert>;
  const [fee] = await db.update(feeRecordsTable).set(updateData).where(eq(feeRecordsTable.id, params.data.id)).returning();
  if (!fee) { res.status(404).json({ error: "Fee record not found" }); return; }
  const full = await getFeeWithDetails(fee.id);
  res.json(full);
});

router.post("/fees/:id/pay", authenticate, async (req, res): Promise<void> => {
  const params = PayFeeParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = PayFeeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [existing] = await db.select().from(feeRecordsTable).where(eq(feeRecordsTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Fee record not found" }); return; }

  const newPaid = (Number(existing.paidAmount ?? 0)) + parsed.data.paidAmount;
  const totalAmount = Number(existing.amount);
  const status = newPaid >= totalAmount ? "paid" : "partial";

  const [fee] = await db.update(feeRecordsTable).set({
    paidAmount: String(newPaid),
    paidDate: parsed.data.paidDate,
    status,
    ...(parsed.data.transactionId && { transactionId: parsed.data.transactionId }),
  }).where(eq(feeRecordsTable.id, params.data.id)).returning();

  const full = await getFeeWithDetails(fee.id);
  res.json(full);
});

export default router;
