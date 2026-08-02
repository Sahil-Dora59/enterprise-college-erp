import { Router, type IRouter } from "express";
import { eq, and, ilike, sql } from "drizzle-orm";
import { db, facultyTable, usersTable, departmentsTable, coursesTable, semestersTable } from "@workspace/db";
import { ListFacultyQueryParams, CreateFacultyBody, GetFacultyParams, UpdateFacultyParams, UpdateFacultyBody, DeleteFacultyParams, GetFacultyCoursesParams } from "@workspace/api-zod";
import { authenticate } from "../middlewares/auth";
import { hashPassword } from "../lib/password";

const router: IRouter = Router();

async function buildFacultyQuery(conditions: ReturnType<typeof and>[], limitNum: number, offset: number) {
  return db
    .select({
      id: facultyTable.id,
      userId: facultyTable.userId,
      employeeId: facultyTable.employeeId,
      departmentId: facultyTable.departmentId,
      designation: facultyTable.designation,
      qualification: facultyTable.qualification,
      specialization: facultyTable.specialization,
      joiningDate: facultyTable.joiningDate,
      isActive: facultyTable.isActive,
      createdAt: facultyTable.createdAt,
      name: usersTable.name,
      email: usersTable.email,
      phone: usersTable.phone,
      avatarUrl: usersTable.avatarUrl,
      departmentName: departmentsTable.name,
    })
    .from(facultyTable)
    .leftJoin(usersTable, eq(facultyTable.userId, usersTable.id))
    .leftJoin(departmentsTable, eq(facultyTable.departmentId, departmentsTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .limit(limitNum)
    .offset(offset);
}

function fmtFaculty(r: Awaited<ReturnType<typeof buildFacultyQuery>>[number]) {
  return { ...r, createdAt: r.createdAt.toISOString() };
}

router.get("/faculty", authenticate, async (req, res): Promise<void> => {
  const parsed = ListFacultyQueryParams.safeParse(req.query);
  const { departmentId, search, page = 1, limit = 20 } = parsed.data ?? {};
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const offset = (pageNum - 1) * limitNum;

  const conditions: ReturnType<typeof eq>[] = [];
  if (departmentId) conditions.push(eq(facultyTable.departmentId, Number(departmentId)));
  if (search) conditions.push(ilike(usersTable.name, `%${search}%`));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, [{ total }]] = await Promise.all([
    buildFacultyQuery(conditions as ReturnType<typeof and>[], limitNum, offset),
    db.select({ total: sql<number>`count(*)::int` })
      .from(facultyTable)
      .leftJoin(usersTable, eq(facultyTable.userId, usersTable.id))
      .where(where),
  ]);

  res.json({ data: data.map(fmtFaculty), total, page: pageNum, limit: limitNum });
});

router.post("/faculty", authenticate, async (req, res): Promise<void> => {
  const parsed = CreateFacultyBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { name, email, password, employeeId, departmentId, designation, qualification, specialization, joiningDate, phone } = parsed.data as typeof parsed.data & { password: string };

  const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email));
  if (existing) { res.status(400).json({ error: "Email already registered" }); return; }

  const passwordHash = await hashPassword(password);

  const result = await db.transaction(async (tx) => {
    const [user] = await tx.insert(usersTable).values({ name, email, passwordHash, role: "faculty", phone }).returning();
    const [faculty] = await tx.insert(facultyTable).values({ userId: user.id, employeeId, departmentId, designation, qualification, specialization, joiningDate }).returning();
    return { ...faculty, name: user.name, email: user.email, phone: user.phone, avatarUrl: user.avatarUrl };
  });

  const [dept] = await db.select({ name: departmentsTable.name }).from(departmentsTable).where(eq(departmentsTable.id, result.departmentId));

  res.status(201).json({ ...result, departmentName: dept?.name ?? null, createdAt: result.createdAt.toISOString() });
});

router.get("/faculty/:id", authenticate, async (req, res): Promise<void> => {
  const params = GetFacultyParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [data] = await buildFacultyQuery([eq(facultyTable.id, params.data.id) as ReturnType<typeof and>], 1, 0);
  if (!data) { res.status(404).json({ error: "Faculty not found" }); return; }
  res.json(fmtFaculty(data));
});

router.patch("/faculty/:id", authenticate, async (req, res): Promise<void> => {
  const params = UpdateFacultyParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateFacultyBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { name, email, isActive, phone, ...facultyFields } = parsed.data as typeof parsed.data & { name?: string; email?: string; phone?: string; isActive?: boolean };
  const [faculty] = await db.select().from(facultyTable).where(eq(facultyTable.id, params.data.id));
  if (!faculty) { res.status(404).json({ error: "Faculty not found" }); return; }

  if (name || email || isActive !== undefined || phone) {
    await db.update(usersTable).set({ ...(name && { name }), ...(email && { email }), ...(isActive !== undefined && { isActive }), ...(phone && { phone }) }).where(eq(usersTable.id, faculty.userId));
  }
  if (Object.keys(facultyFields).length > 0) {
    await db.update(facultyTable).set(facultyFields).where(eq(facultyTable.id, params.data.id));
  }

  const [data] = await buildFacultyQuery([eq(facultyTable.id, params.data.id) as ReturnType<typeof and>], 1, 0);
  res.json(fmtFaculty(data!));
});

router.delete("/faculty/:id", authenticate, async (req, res): Promise<void> => {
  const params = DeleteFacultyParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [f] = await db.delete(facultyTable).where(eq(facultyTable.id, params.data.id)).returning();
  if (!f) { res.status(404).json({ error: "Faculty not found" }); return; }
  res.sendStatus(204);
});

router.get("/faculty/:id/courses", authenticate, async (req, res): Promise<void> => {
  const params = GetFacultyCoursesParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const courses = await db
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
    })
    .from(coursesTable)
    .leftJoin(departmentsTable, eq(coursesTable.departmentId, departmentsTable.id))
    .leftJoin(semestersTable, eq(coursesTable.semesterId, semestersTable.id))
    .where(eq(coursesTable.facultyId, params.data.id));

  res.json(courses.map((c) => ({ ...c, facultyName: null, enrolledCount: null, createdAt: c.createdAt.toISOString() })));
});

router.get("/faculty/dashboard/summary", authenticate, async (_req, res): Promise<void> => {
  const [[{ totalFaculty }], [{ activeFaculty }], [{ totalCourses }], [{ totalDepartments }]] = await Promise.all([
    db.select({ totalFaculty: sql<number>`count(*)::int` }).from(facultyTable),
    db.select({ activeFaculty: sql<number>`count(*)::int` }).from(facultyTable).where(eq(facultyTable.isActive, true)),
    db.select({ totalCourses: sql<number>`count(*)::int` }).from(coursesTable),
    db.select({ totalDepartments: sql<number>`count(*)::int` }).from(departmentsTable),
  ]);
  res.json({ totalFaculty, activeFaculty, totalCourses, totalDepartments });
});

router.get("/faculty/:id/workload", authenticate, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) { res.status(400).json({ error: "Invalid faculty id" }); return; }
  const courses = await db.select({
    id: coursesTable.id,
    name: coursesTable.name,
    code: coursesTable.code,
    credits: coursesTable.credits,
    departmentName: departmentsTable.name,
    semesterName: semestersTable.name,
  }).from(coursesTable)
    .leftJoin(departmentsTable, eq(coursesTable.departmentId, departmentsTable.id))
    .leftJoin(semestersTable, eq(coursesTable.semesterId, semestersTable.id))
    .where(eq(coursesTable.facultyId, id));
  res.json({ facultyId: id, assignedCourses: courses, totalCourses: courses.length, totalCredits: courses.reduce((sum, course) => sum + (course.credits ?? 0), 0) });
});

export default router;
