import { Router, type IRouter } from "express";
import { eq, and, ilike, sql } from "drizzle-orm";
import { db, studentsTable, usersTable, departmentsTable, semestersTable, coursesTable, facultyTable } from "@workspace/db";
import { ListStudentsQueryParams, CreateStudentBody, GetStudentParams, UpdateStudentParams, UpdateStudentBody, DeleteStudentParams, GetStudentCoursesParams } from "@workspace/api-zod";
import { authenticate } from "../middlewares/auth";
import { hashPassword } from "../lib/password";

const router: IRouter = Router();

async function buildStudentQuery(conditions: ReturnType<typeof and>[], limitNum: number, offset: number) {
  return db
    .select({
      id: studentsTable.id,
      userId: studentsTable.userId,
      rollNumber: studentsTable.rollNumber,
      departmentId: studentsTable.departmentId,
      semesterId: studentsTable.semesterId,
      admissionDate: studentsTable.admissionDate,
      dateOfBirth: studentsTable.dateOfBirth,
      address: studentsTable.address,
      guardianName: studentsTable.guardianName,
      guardianPhone: studentsTable.guardianPhone,
      isActive: studentsTable.isActive,
      createdAt: studentsTable.createdAt,
      name: usersTable.name,
      email: usersTable.email,
      phone: usersTable.phone,
      avatarUrl: usersTable.avatarUrl,
      departmentName: departmentsTable.name,
      semesterName: semestersTable.name,
    })
    .from(studentsTable)
    .leftJoin(usersTable, eq(studentsTable.userId, usersTable.id))
    .leftJoin(departmentsTable, eq(studentsTable.departmentId, departmentsTable.id))
    .leftJoin(semestersTable, eq(studentsTable.semesterId, semestersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .limit(limitNum)
    .offset(offset);
}

function fmtStudent(r: Awaited<ReturnType<typeof buildStudentQuery>>[number]) {
  return { ...r, createdAt: r.createdAt.toISOString() };
}

router.get("/students", authenticate, async (req, res): Promise<void> => {
  const parsed = ListStudentsQueryParams.safeParse(req.query);
  const { departmentId, semesterId, search, page = 1, limit = 20 } = parsed.data ?? {};
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const offset = (pageNum - 1) * limitNum;

  const conditions: ReturnType<typeof eq>[] = [];
  if (departmentId) conditions.push(eq(studentsTable.departmentId, Number(departmentId)));
  if (semesterId) conditions.push(eq(studentsTable.semesterId, Number(semesterId)));
  if (search) conditions.push(ilike(usersTable.name, `%${search}%`));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, [{ total }]] = await Promise.all([
    buildStudentQuery(conditions as ReturnType<typeof and>[], limitNum, offset),
    db.select({ total: sql<number>`count(*)::int` })
      .from(studentsTable)
      .leftJoin(usersTable, eq(studentsTable.userId, usersTable.id))
      .where(where),
  ]);

  res.json({ data: data.map(fmtStudent), total, page: pageNum, limit: limitNum });
});

router.post("/students", authenticate, async (req, res): Promise<void> => {
  const parsed = CreateStudentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { name, email, password, rollNumber, departmentId, semesterId, admissionDate, dateOfBirth, phone, address, guardianName, guardianPhone } = parsed.data as typeof parsed.data & { password: string };

  const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email));
  if (existing) { res.status(400).json({ error: "Email already registered" }); return; }

  const passwordHash = await hashPassword(password);

  const result = await db.transaction(async (tx) => {
    const [user] = await tx.insert(usersTable).values({ name, email, passwordHash, role: "student", phone }).returning();
    const [student] = await tx.insert(studentsTable).values({ userId: user.id, rollNumber, departmentId, semesterId, admissionDate, dateOfBirth, address, guardianName, guardianPhone }).returning();
    return { ...student, name: user.name, email: user.email, phone: user.phone, avatarUrl: user.avatarUrl };
  });

  const [dept] = await db.select({ name: departmentsTable.name }).from(departmentsTable).where(eq(departmentsTable.id, result.departmentId));
  const [sem] = await db.select({ name: semestersTable.name }).from(semestersTable).where(eq(semestersTable.id, result.semesterId));

  res.status(201).json({ ...result, departmentName: dept?.name ?? null, semesterName: sem?.name ?? null, createdAt: result.createdAt.toISOString() });
});

router.get("/students/:id", authenticate, async (req, res): Promise<void> => {
  const params = GetStudentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [data] = await buildStudentQuery([eq(studentsTable.id, params.data.id) as ReturnType<typeof and>], 1, 0);
  if (!data) { res.status(404).json({ error: "Student not found" }); return; }
  res.json(fmtStudent(data));
});

router.patch("/students/:id", authenticate, async (req, res): Promise<void> => {
  const params = UpdateStudentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateStudentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { name, email, isActive, phone, ...studentFields } = parsed.data as typeof parsed.data & { name?: string; email?: string; phone?: string; isActive?: boolean };

  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, params.data.id));
  if (!student) { res.status(404).json({ error: "Student not found" }); return; }

  if (name || email || isActive !== undefined || phone) {
    await db.update(usersTable).set({ ...(name && { name }), ...(email && { email }), ...(isActive !== undefined && { isActive }), ...(phone && { phone }) }).where(eq(usersTable.id, student.userId));
  }
  if (Object.keys(studentFields).length > 0) {
    await db.update(studentsTable).set(studentFields).where(eq(studentsTable.id, params.data.id));
  }

  const [data] = await buildStudentQuery([eq(studentsTable.id, params.data.id) as ReturnType<typeof and>], 1, 0);
  res.json(fmtStudent(data!));
});

router.delete("/students/:id", authenticate, async (req, res): Promise<void> => {
  const params = DeleteStudentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [s] = await db.delete(studentsTable).where(eq(studentsTable.id, params.data.id)).returning();
  if (!s) { res.status(404).json({ error: "Student not found" }); return; }
  res.sendStatus(204);
});

router.get("/students/:id/courses", authenticate, async (req, res): Promise<void> => {
  const params = GetStudentCoursesParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, params.data.id));
  if (!student) { res.status(404).json({ error: "Student not found" }); return; }

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
      facultyName: usersTable.name,
    })
    .from(coursesTable)
    .leftJoin(departmentsTable, eq(coursesTable.departmentId, departmentsTable.id))
    .leftJoin(semestersTable, eq(coursesTable.semesterId, semestersTable.id))
    .leftJoin(facultyTable, eq(coursesTable.facultyId, facultyTable.id))
    .leftJoin(usersTable, eq(facultyTable.userId, usersTable.id))
    .where(and(eq(coursesTable.departmentId, student.departmentId), eq(coursesTable.semesterId, student.semesterId)));

  res.json(courses.map((c) => ({ ...c, enrolledCount: null, createdAt: c.createdAt.toISOString() })));
});

export default router;
