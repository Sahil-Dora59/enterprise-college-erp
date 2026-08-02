import { Router, type IRouter } from "express";
import { eq, and, ilike, sql } from "drizzle-orm";
import { db, studentsTable, usersTable, departmentsTable, semestersTable, coursesTable, facultyTable, attendanceTable, feeRecordsTable, examinationsTable, assignmentsTable, noticesTable } from "@workspace/db";
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
  return {
    ...r,
    registrationNumber: `REG-${new Date(r.admissionDate).getFullYear()}-${String(r.id).padStart(5, "0")}`,
    studentId: `STU-${String(r.id).padStart(6, "0")}`,
    status: r.isActive ? "active" : "inactive",
    createdAt: r.createdAt.toISOString(),
  };
}

router.get("/students", authenticate, async (req, res): Promise<void> => {
  const parsed = ListStudentsQueryParams.safeParse(req.query);
  const { departmentId, semesterId, search, page = 1, limit = 20 } = parsed.data ?? {};
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const offset = (pageNum - 1) * limitNum;

  const conditions: ReturnType<typeof eq>[] = [];
  if (req.user?.role === "student") conditions.push(eq(studentsTable.userId, req.user.userId));
  if (departmentId) conditions.push(eq(studentsTable.departmentId, Number(departmentId)));
  if (semesterId) conditions.push(eq(studentsTable.semesterId, Number(semesterId)));
  if (search) conditions.push(ilike(usersTable.name, `%${search}%`));
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  if (status === "active") conditions.push(eq(studentsTable.isActive, true));
  if (status === "inactive" || status === "alumni") conditions.push(eq(studentsTable.isActive, false));
  if (search && /^REG-|^STU-/i.test(search)) {
    const numeric = Number(search.replace(/\D/g, ""));
    if (numeric > 0) conditions.push(eq(studentsTable.id, numeric));
  }

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
  const studentConditions = [eq(studentsTable.id, params.data.id) as ReturnType<typeof and>];
  if (req.user?.role === "student") studentConditions.push(eq(studentsTable.userId, req.user.userId) as ReturnType<typeof and>);
  const [data] = await buildStudentQuery(studentConditions, 1, 0);
  if (!data) { res.status(404).json({ error: "Student not found" }); return; }
  res.json(fmtStudent(data));
});

router.patch("/students/:id", authenticate, async (req, res): Promise<void> => {
  const params = UpdateStudentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  if (req.user?.role === "student") { res.status(403).json({ error: "Students cannot edit academic records" }); return; }
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
  if (req.user?.role === "student") { res.status(403).json({ error: "Students cannot delete academic records" }); return; }
  const [s] = await db.delete(studentsTable).where(eq(studentsTable.id, params.data.id)).returning();
  if (!s) { res.status(404).json({ error: "Student not found" }); return; }
  res.sendStatus(204);
});

router.post("/students/:id/transfer", authenticate, async (req, res): Promise<void> => {
  if (req.user?.role === "student") { res.status(403).json({ error: "Students cannot transfer records" }); return; }
  const id = Number(req.params.id);
  const { departmentId, semesterId, rollNumber } = req.body ?? {};
  if (!Number.isInteger(id) || !departmentId || !semesterId) { res.status(400).json({ error: "Department and semester are required" }); return; }
  const [student] = await db.update(studentsTable).set({ departmentId: Number(departmentId), semesterId: Number(semesterId), ...(rollNumber ? { rollNumber: String(rollNumber) } : {}) }).where(eq(studentsTable.id, id)).returning();
  if (!student) { res.status(404).json({ error: "Student not found" }); return; }
  res.json({ id: student.id, status: "transferred", departmentId: student.departmentId, semesterId: student.semesterId });
});

router.post("/students/:id/archive", authenticate, async (req, res): Promise<void> => {
  if (req.user?.role === "student") { res.status(403).json({ error: "Students cannot archive records" }); return; }
  const id = Number(req.params.id);
  const [student] = await db.update(studentsTable).set({ isActive: false }).where(eq(studentsTable.id, id)).returning();
  if (!student) { res.status(404).json({ error: "Student not found" }); return; }
  await db.update(usersTable).set({ isActive: false }).where(eq(usersTable.id, student.userId));
  res.json({ id, status: "archived" });
});

router.get("/students/:id/dashboard", authenticate, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, id));
  if (!student || (req.user?.role === "student" && student.userId !== req.user.userId)) { res.status(404).json({ error: "Student not found" }); return; }
  const [attendance, fees, exams, assignments, notices] = await Promise.all([
    db.select({ total: sql<number>`count(*)::int`, present: sql<number>`count(*) filter (where ${attendanceTable.status} = 'present')::int` }).from(attendanceTable).where(eq(attendanceTable.studentId, id)),
    db.select({ amount: feeRecordsTable.amount, paidAmount: feeRecordsTable.paidAmount, status: feeRecordsTable.status }).from(feeRecordsTable).where(eq(feeRecordsTable.studentId, id)),
    db.select({ id: examinationsTable.id, name: examinationsTable.name, examDate: examinationsTable.examDate, type: examinationsTable.type }).from(examinationsTable).where(eq(examinationsTable.semesterId, student.semesterId)),
    db.select({ id: assignmentsTable.id, title: assignmentsTable.title, dueDate: assignmentsTable.dueDate, courseId: assignmentsTable.courseId }).from(assignmentsTable).where(eq(assignmentsTable.status, "active")),
    db.select({ id: noticesTable.id, title: noticesTable.title, priority: noticesTable.priority, publishedAt: noticesTable.publishedAt }).from(noticesTable).where(eq(noticesTable.isActive, true)).limit(5),
  ]);
  const totalFees = fees.reduce((sum, fee) => sum + Number(fee.amount), 0);
  const paidFees = fees.reduce((sum, fee) => sum + Number(fee.paidAmount ?? 0), 0);
  res.json({
    studentId: id,
    attendance: { total: attendance[0]?.total ?? 0, present: attendance[0]?.present ?? 0, percentage: attendance[0]?.total ? Math.round((attendance[0].present / attendance[0].total) * 1000) / 10 : 0 },
    fees: { total: totalFees, paid: paidFees, outstanding: Math.max(0, totalFees - paidFees) },
    upcomingExams: exams,
    assignments,
    notices: notices.map((notice) => ({ ...notice, publishedAt: notice.publishedAt.toISOString() })),
    profileCompletion: [student.rollNumber, student.departmentId, student.semesterId, student.admissionDate, student.dateOfBirth, student.address, student.guardianName, student.guardianPhone].filter(Boolean).length / 8 * 100,
  });
});

router.get("/students/:id/courses", authenticate, async (req, res): Promise<void> => {
  const params = GetStudentCoursesParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  if (req.user?.role === "student") {
    const [owner] = await db.select({ id: studentsTable.id }).from(studentsTable)
      .where(and(eq(studentsTable.id, params.data.id), eq(studentsTable.userId, req.user.userId)));
    if (!owner) { res.status(403).json({ error: "Access denied" }); return; }
  }
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
