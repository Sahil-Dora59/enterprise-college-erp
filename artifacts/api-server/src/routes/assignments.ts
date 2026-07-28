import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, assignmentsTable, submissionsTable, coursesTable, facultyTable, usersTable, studentsTable } from "@workspace/db";
import { ListAssignmentsQueryParams, CreateAssignmentBody, GetAssignmentParams, UpdateAssignmentParams, UpdateAssignmentBody, DeleteAssignmentParams, SubmitAssignmentParams, SubmitAssignmentBody, ListSubmissionsParams } from "@workspace/api-zod";
import { authenticate } from "../middlewares/auth";

const router: IRouter = Router();

async function getAssignmentWithDetails(id: number) {
  const [row] = await db
    .select({
      id: assignmentsTable.id,
      title: assignmentsTable.title,
      description: assignmentsTable.description,
      courseId: assignmentsTable.courseId,
      facultyId: assignmentsTable.facultyId,
      dueDate: assignmentsTable.dueDate,
      totalMarks: assignmentsTable.totalMarks,
      status: assignmentsTable.status,
      createdAt: assignmentsTable.createdAt,
      courseName: coursesTable.name,
      facultyName: usersTable.name,
    })
    .from(assignmentsTable)
    .leftJoin(coursesTable, eq(assignmentsTable.courseId, coursesTable.id))
    .leftJoin(facultyTable, eq(assignmentsTable.facultyId, facultyTable.id))
    .leftJoin(usersTable, eq(facultyTable.userId, usersTable.id))
    .where(eq(assignmentsTable.id, id));

  if (!row) return null;

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(submissionsTable).where(eq(submissionsTable.assignmentId, id));
  return { ...row, submissionCount: count, createdAt: row.createdAt.toISOString() };
}

router.get("/assignments", authenticate, async (req, res): Promise<void> => {
  const parsed = ListAssignmentsQueryParams.safeParse(req.query);
  const { courseId, facultyId, status } = parsed.data ?? {};

  const conditions: ReturnType<typeof eq>[] = [];
  if (courseId) conditions.push(eq(assignmentsTable.courseId, Number(courseId)));
  if (facultyId) conditions.push(eq(assignmentsTable.facultyId, Number(facultyId)));
  if (status) conditions.push(eq(assignmentsTable.status, status as string));

  const rows = await db
    .select({
      id: assignmentsTable.id,
      title: assignmentsTable.title,
      description: assignmentsTable.description,
      courseId: assignmentsTable.courseId,
      facultyId: assignmentsTable.facultyId,
      dueDate: assignmentsTable.dueDate,
      totalMarks: assignmentsTable.totalMarks,
      status: assignmentsTable.status,
      createdAt: assignmentsTable.createdAt,
      courseName: coursesTable.name,
      facultyName: usersTable.name,
    })
    .from(assignmentsTable)
    .leftJoin(coursesTable, eq(assignmentsTable.courseId, coursesTable.id))
    .leftJoin(facultyTable, eq(assignmentsTable.facultyId, facultyTable.id))
    .leftJoin(usersTable, eq(facultyTable.userId, usersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  res.json(rows.map((r) => ({ ...r, submissionCount: null, createdAt: r.createdAt.toISOString() })));
});

router.post("/assignments", authenticate, async (req, res): Promise<void> => {
  const parsed = CreateAssignmentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [assignment] = await db.insert(assignmentsTable).values(parsed.data).returning();
  const full = await getAssignmentWithDetails(assignment.id);
  res.status(201).json(full);
});

router.get("/assignments/:id", authenticate, async (req, res): Promise<void> => {
  const params = GetAssignmentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const full = await getAssignmentWithDetails(params.data.id);
  if (!full) { res.status(404).json({ error: "Assignment not found" }); return; }
  res.json(full);
});

router.patch("/assignments/:id", authenticate, async (req, res): Promise<void> => {
  const params = UpdateAssignmentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateAssignmentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [a] = await db.update(assignmentsTable).set(parsed.data).where(eq(assignmentsTable.id, params.data.id)).returning();
  if (!a) { res.status(404).json({ error: "Assignment not found" }); return; }
  const full = await getAssignmentWithDetails(a.id);
  res.json(full);
});

router.delete("/assignments/:id", authenticate, async (req, res): Promise<void> => {
  const params = DeleteAssignmentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [a] = await db.delete(assignmentsTable).where(eq(assignmentsTable.id, params.data.id)).returning();
  if (!a) { res.status(404).json({ error: "Assignment not found" }); return; }
  res.sendStatus(204);
});

router.post("/assignments/:id/submit", authenticate, async (req, res): Promise<void> => {
  const params = SubmitAssignmentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = SubmitAssignmentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [sub] = await db.insert(submissionsTable).values({ ...parsed.data, assignmentId: params.data.id }).returning();
  res.status(201).json({ ...sub, marksObtained: sub.marksObtained ? Number(sub.marksObtained) : null, submittedAt: sub.submittedAt.toISOString(), createdAt: sub.createdAt.toISOString() });
});

router.get("/assignments/:id/submissions", authenticate, async (req, res): Promise<void> => {
  const params = ListSubmissionsParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const rows = await db
    .select({
      id: submissionsTable.id,
      assignmentId: submissionsTable.assignmentId,
      studentId: submissionsTable.studentId,
      content: submissionsTable.content,
      fileUrl: submissionsTable.fileUrl,
      marksObtained: submissionsTable.marksObtained,
      feedback: submissionsTable.feedback,
      status: submissionsTable.status,
      submittedAt: submissionsTable.submittedAt,
      createdAt: submissionsTable.createdAt,
      studentName: usersTable.name,
      rollNumber: studentsTable.rollNumber,
    })
    .from(submissionsTable)
    .leftJoin(studentsTable, eq(submissionsTable.studentId, studentsTable.id))
    .leftJoin(usersTable, eq(studentsTable.userId, usersTable.id))
    .where(eq(submissionsTable.assignmentId, params.data.id));

  res.json(rows.map((r) => ({ ...r, marksObtained: r.marksObtained ? Number(r.marksObtained) : null, submittedAt: r.submittedAt.toISOString(), createdAt: r.createdAt.toISOString() })));
});

export default router;
