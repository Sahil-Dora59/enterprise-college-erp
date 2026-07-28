import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, examinationsTable, coursesTable, semestersTable } from "@workspace/db";
import { ListExaminationsQueryParams, CreateExaminationBody, GetExaminationParams, UpdateExaminationParams, UpdateExaminationBody, DeleteExaminationParams } from "@workspace/api-zod";
import { authenticate } from "../middlewares/auth";

const router: IRouter = Router();

async function getExamWithDetails(id: number) {
  const [row] = await db
    .select({
      id: examinationsTable.id,
      name: examinationsTable.name,
      courseId: examinationsTable.courseId,
      semesterId: examinationsTable.semesterId,
      type: examinationsTable.type,
      examDate: examinationsTable.examDate,
      startTime: examinationsTable.startTime,
      endTime: examinationsTable.endTime,
      totalMarks: examinationsTable.totalMarks,
      passingMarks: examinationsTable.passingMarks,
      venue: examinationsTable.venue,
      createdAt: examinationsTable.createdAt,
      courseName: coursesTable.name,
      semesterName: semestersTable.name,
    })
    .from(examinationsTable)
    .leftJoin(coursesTable, eq(examinationsTable.courseId, coursesTable.id))
    .leftJoin(semestersTable, eq(examinationsTable.semesterId, semestersTable.id))
    .where(eq(examinationsTable.id, id));
  if (!row) return null;
  return { ...row, createdAt: row.createdAt.toISOString() };
}

router.get("/examinations", authenticate, async (req, res): Promise<void> => {
  const parsed = ListExaminationsQueryParams.safeParse(req.query);
  const { semesterId, courseId } = parsed.data ?? {};

  const conditions: ReturnType<typeof eq>[] = [];
  if (semesterId) conditions.push(eq(examinationsTable.semesterId, Number(semesterId)));
  if (courseId) conditions.push(eq(examinationsTable.courseId, Number(courseId)));

  const rows = await db
    .select({
      id: examinationsTable.id,
      name: examinationsTable.name,
      courseId: examinationsTable.courseId,
      semesterId: examinationsTable.semesterId,
      type: examinationsTable.type,
      examDate: examinationsTable.examDate,
      startTime: examinationsTable.startTime,
      endTime: examinationsTable.endTime,
      totalMarks: examinationsTable.totalMarks,
      passingMarks: examinationsTable.passingMarks,
      venue: examinationsTable.venue,
      createdAt: examinationsTable.createdAt,
      courseName: coursesTable.name,
      semesterName: semestersTable.name,
    })
    .from(examinationsTable)
    .leftJoin(coursesTable, eq(examinationsTable.courseId, coursesTable.id))
    .leftJoin(semestersTable, eq(examinationsTable.semesterId, semestersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/examinations", authenticate, async (req, res): Promise<void> => {
  const parsed = CreateExaminationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [exam] = await db.insert(examinationsTable).values(parsed.data).returning();
  const full = await getExamWithDetails(exam.id);
  res.status(201).json(full);
});

router.get("/examinations/:id", authenticate, async (req, res): Promise<void> => {
  const params = GetExaminationParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const full = await getExamWithDetails(params.data.id);
  if (!full) { res.status(404).json({ error: "Examination not found" }); return; }
  res.json(full);
});

router.patch("/examinations/:id", authenticate, async (req, res): Promise<void> => {
  const params = UpdateExaminationParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateExaminationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [exam] = await db.update(examinationsTable).set(parsed.data).where(eq(examinationsTable.id, params.data.id)).returning();
  if (!exam) { res.status(404).json({ error: "Examination not found" }); return; }
  const full = await getExamWithDetails(exam.id);
  res.json(full);
});

router.delete("/examinations/:id", authenticate, async (req, res): Promise<void> => {
  const params = DeleteExaminationParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [e] = await db.delete(examinationsTable).where(eq(examinationsTable.id, params.data.id)).returning();
  if (!e) { res.status(404).json({ error: "Examination not found" }); return; }
  res.sendStatus(204);
});

export default router;
