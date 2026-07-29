import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, marksTable, studentsTable, usersTable, examinationsTable, coursesTable } from "@workspace/db";
import { ListMarksQueryParams, EnterMarkBody, UpdateMarkParams, UpdateMarkBody, GetMarksReportQueryParams } from "@workspace/api-zod";
import { authenticate } from "../middlewares/auth";
import { getStudentIdForUser } from "../lib/rbac";

const router: IRouter = Router();

function computeGrade(obtained: number, total: number): string {
  const pct = (obtained / total) * 100;
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C";
  if (pct >= 40) return "D";
  return "F";
}

router.get("/marks", authenticate, async (req, res): Promise<void> => {
  const parsed = ListMarksQueryParams.safeParse(req.query);
  const { examinationId, studentId } = parsed.data ?? {};

  const conditions: ReturnType<typeof eq>[] = [];
  if (req.user?.role === "student") {
    const ownStudentId = await getStudentIdForUser(req.user.userId);
    if (!ownStudentId) { res.status(403).json({ error: "Student profile not found" }); return; }
    conditions.push(eq(marksTable.studentId, ownStudentId));
  }
  if (examinationId) conditions.push(eq(marksTable.examinationId, Number(examinationId)));
  if (studentId) conditions.push(eq(marksTable.studentId, Number(studentId)));

  const rows = await db
    .select({
      id: marksTable.id,
      studentId: marksTable.studentId,
      examinationId: marksTable.examinationId,
      marksObtained: marksTable.marksObtained,
      grade: marksTable.grade,
      remarks: marksTable.remarks,
      createdAt: marksTable.createdAt,
      studentName: usersTable.name,
      rollNumber: studentsTable.rollNumber,
      examinationName: examinationsTable.name,
    })
    .from(marksTable)
    .leftJoin(studentsTable, eq(marksTable.studentId, studentsTable.id))
    .leftJoin(usersTable, eq(studentsTable.userId, usersTable.id))
    .leftJoin(examinationsTable, eq(marksTable.examinationId, examinationsTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  res.json(rows.map((r) => ({ ...r, marksObtained: Number(r.marksObtained), createdAt: r.createdAt.toISOString() })));
});

router.post("/marks", authenticate, async (req, res): Promise<void> => {
  const parsed = EnterMarkBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [exam] = await db.select().from(examinationsTable).where(eq(examinationsTable.id, parsed.data.examinationId));
  if (!exam) { res.status(404).json({ error: "Examination not found" }); return; }
  if (parsed.data.marksObtained < 0 || parsed.data.marksObtained > exam.totalMarks) {
    res.status(400).json({ error: `Marks must be between 0 and ${exam.totalMarks}` });
    return;
  }

  const grade = parsed.data.grade ?? computeGrade(parsed.data.marksObtained, exam.totalMarks);
  const [mark] = await db.insert(marksTable).values({ ...parsed.data, marksObtained: String(parsed.data.marksObtained), grade }).returning();

  res.status(201).json({ ...mark, marksObtained: Number(mark.marksObtained), createdAt: mark.createdAt.toISOString() });
});

router.patch("/marks/:id", authenticate, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const params = UpdateMarkParams.safeParse({ id });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateMarkBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  if (parsed.data.marksObtained !== undefined) {
    const [markExam] = await db.select({ totalMarks: examinationsTable.totalMarks })
      .from(marksTable)
      .innerJoin(examinationsTable, eq(marksTable.examinationId, examinationsTable.id))
      .where(eq(marksTable.id, params.data.id));
    if (!markExam) { res.status(404).json({ error: "Mark not found" }); return; }
    if (parsed.data.marksObtained < 0 || parsed.data.marksObtained > markExam.totalMarks) {
      res.status(400).json({ error: `Marks must be between 0 and ${markExam.totalMarks}` });
      return;
    }
  }

  const updateData = {
    ...parsed.data,
    ...(parsed.data.marksObtained !== undefined && { marksObtained: String(parsed.data.marksObtained) }),
  } as Partial<typeof marksTable.$inferInsert>;
  const [mark] = await db.update(marksTable).set(updateData).where(eq(marksTable.id, params.data.id)).returning();
  if (!mark) { res.status(404).json({ error: "Mark not found" }); return; }
  res.json({ ...mark, marksObtained: Number(mark.marksObtained), createdAt: mark.createdAt.toISOString() });
});

router.get("/marks/report", authenticate, async (req, res): Promise<void> => {
  const parsed = GetMarksReportQueryParams.safeParse(req.query);
  const { examinationId, semesterId } = parsed.data ?? {};

  let examCondition: ReturnType<typeof eq> | undefined;
  if (examinationId) examCondition = eq(marksTable.examinationId, Number(examinationId));
  const reportConditions: ReturnType<typeof eq>[] = [];
  if (examCondition) reportConditions.push(examCondition);
  if (semesterId) reportConditions.push(eq(examinationsTable.semesterId, Number(semesterId)));
  if (req.user?.role === "student") {
    const ownStudentId = await getStudentIdForUser(req.user.userId);
    if (!ownStudentId) { res.status(403).json({ error: "Student profile not found" }); return; }
    reportConditions.push(eq(marksTable.studentId, ownStudentId));
  }

  const rows = await db
    .select({
      studentId: marksTable.studentId,
      examinationId: marksTable.examinationId,
      marksObtained: marksTable.marksObtained,
      grade: marksTable.grade,
      studentName: usersTable.name,
      rollNumber: studentsTable.rollNumber,
      examinationName: examinationsTable.name,
      totalMarks: examinationsTable.totalMarks,
      passingMarks: examinationsTable.passingMarks,
    })
    .from(marksTable)
    .leftJoin(studentsTable, eq(marksTable.studentId, studentsTable.id))
    .leftJoin(usersTable, eq(studentsTable.userId, usersTable.id))
    .leftJoin(examinationsTable, eq(marksTable.examinationId, examinationsTable.id))
    .where(reportConditions.length > 0 ? and(...reportConditions) : undefined);

  // Group by student
  const studentMap = new Map<number, { studentId: number; studentName: string; rollNumber: string; results: { examinationId: number; examinationName: string; totalMarks: number; marksObtained: number; grade: string | null }[]; totalMarks: number; totalObtained: number }>();

  for (const row of rows) {
    if (!studentMap.has(row.studentId)) {
      studentMap.set(row.studentId, { studentId: row.studentId, studentName: row.studentName ?? "", rollNumber: row.rollNumber ?? "", results: [], totalMarks: 0, totalObtained: 0 });
    }
    const entry = studentMap.get(row.studentId)!;
    const obtained = Number(row.marksObtained);
    const total = row.totalMarks ?? 0;
    entry.results.push({ examinationId: row.examinationId, examinationName: row.examinationName ?? "", totalMarks: total, marksObtained: obtained, grade: row.grade });
    entry.totalMarks += total;
    entry.totalObtained += obtained;
  }

  const report = Array.from(studentMap.values()).map((e) => {
    const pct = e.totalMarks > 0 ? Math.round((e.totalObtained / e.totalMarks) * 100 * 10) / 10 : 0;
    return { ...e, percentage: pct, grade: computeGrade(e.totalObtained, e.totalMarks), result: pct >= 40 ? "Pass" : "Fail" };
  });

  res.json(report);
});

export default router;
