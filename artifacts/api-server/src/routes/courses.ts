import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, coursesTable, departmentsTable, semestersTable, facultyTable, usersTable, studentsTable } from "@workspace/db";
import { ListCoursesQueryParams, CreateCourseBody, GetCourseParams, UpdateCourseParams, UpdateCourseBody, DeleteCourseParams } from "@workspace/api-zod";
import { authenticate } from "../middlewares/auth";

const router: IRouter = Router();

async function getCourseWithDetails(courseId: number) {
  const [row] = await db
    .select({
      id: coursesTable.id,
      name: coursesTable.name,
      code: coursesTable.code,
      credits: coursesTable.credits,
      departmentId: coursesTable.departmentId,
      semesterId: coursesTable.semesterId,
      facultyId: coursesTable.facultyId,
      description: coursesTable.description,
      maxStudents: coursesTable.maxStudents,
      createdAt: coursesTable.createdAt,
      departmentName: departmentsTable.name,
      semesterName: semestersTable.name,
      facultyName: usersTable.name,
    })
    .from(coursesTable)
    .leftJoin(departmentsTable, eq(coursesTable.departmentId, departmentsTable.id))
    .leftJoin(semestersTable, eq(coursesTable.semesterId, semestersTable.id))
    .leftJoin(facultyTable, eq(coursesTable.facultyId, facultyTable.id))
    .leftJoin(usersTable, eq(facultyTable.userId, usersTable.id))
    .where(eq(coursesTable.id, courseId));
  if (!row) return null;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(studentsTable)
    .where(and(eq(studentsTable.departmentId, row.departmentId), eq(studentsTable.semesterId, row.semesterId)));

  return { ...row, enrolledCount: count, createdAt: row.createdAt.toISOString() };
}

router.get("/courses", authenticate, async (req, res): Promise<void> => {
  const parsed = ListCoursesQueryParams.safeParse(req.query);
  const { departmentId, semesterId } = parsed.data ?? {};

  const conditions = [];
  if (departmentId) conditions.push(eq(coursesTable.departmentId, Number(departmentId)));
  if (semesterId) conditions.push(eq(coursesTable.semesterId, Number(semesterId)));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: coursesTable.id,
      name: coursesTable.name,
      code: coursesTable.code,
      credits: coursesTable.credits,
      departmentId: coursesTable.departmentId,
      semesterId: coursesTable.semesterId,
      facultyId: coursesTable.facultyId,
      description: coursesTable.description,
      maxStudents: coursesTable.maxStudents,
      createdAt: coursesTable.createdAt,
      departmentName: departmentsTable.name,
      semesterName: semestersTable.name,
      facultyName: usersTable.name,
    })
    .from(coursesTable)
    .leftJoin(departmentsTable, eq(coursesTable.departmentId, departmentsTable.id))
    .leftJoin(semestersTable, eq(coursesTable.semesterId, semestersTable.id))
    .leftJoin(facultyTable, eq(coursesTable.facultyId, facultyTable.id))
    .leftJoin(usersTable, eq(facultyTable.userId, usersTable.id))
    .where(where);

  res.json(rows.map((r) => ({ ...r, enrolledCount: null, createdAt: r.createdAt.toISOString() })));
});

router.post("/courses", authenticate, async (req, res): Promise<void> => {
  const parsed = CreateCourseBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [course] = await db.insert(coursesTable).values(parsed.data).returning();
  const full = await getCourseWithDetails(course.id);
  res.status(201).json(full);
});

router.get("/courses/:id", authenticate, async (req, res): Promise<void> => {
  const params = GetCourseParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const full = await getCourseWithDetails(params.data.id);
  if (!full) { res.status(404).json({ error: "Course not found" }); return; }
  res.json(full);
});

router.patch("/courses/:id", authenticate, async (req, res): Promise<void> => {
  const params = UpdateCourseParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateCourseBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [course] = await db.update(coursesTable).set(parsed.data).where(eq(coursesTable.id, params.data.id)).returning();
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }
  const full = await getCourseWithDetails(course.id);
  res.json(full);
});

router.delete("/courses/:id", authenticate, async (req, res): Promise<void> => {
  const params = DeleteCourseParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [c] = await db.delete(coursesTable).where(eq(coursesTable.id, params.data.id)).returning();
  if (!c) { res.status(404).json({ error: "Course not found" }); return; }
  res.sendStatus(204);
});

export default router;
