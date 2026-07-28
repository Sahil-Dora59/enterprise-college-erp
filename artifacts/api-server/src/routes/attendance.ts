import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, attendanceTable, studentsTable, usersTable, coursesTable } from "@workspace/db";
import { ListAttendanceQueryParams, MarkAttendanceBody, BulkMarkAttendanceBody, GetAttendanceSummaryQueryParams } from "@workspace/api-zod";
import { authenticate } from "../middlewares/auth";

const router: IRouter = Router();

function fmtRecord(r: typeof attendanceTable.$inferSelect & { studentName?: string | null; rollNumber?: string | null; courseName?: string | null }) {
  return { ...r, createdAt: r.createdAt.toISOString() };
}

router.get("/attendance", authenticate, async (req, res): Promise<void> => {
  const parsed = ListAttendanceQueryParams.safeParse(req.query);
  const { courseId, studentId, date, month, year } = parsed.data ?? {};

  const conditions: ReturnType<typeof eq>[] = [];
  if (courseId) conditions.push(eq(attendanceTable.courseId, Number(courseId)));
  if (studentId) conditions.push(eq(attendanceTable.studentId, Number(studentId)));
  if (date) conditions.push(eq(attendanceTable.date, date as string));

  const rows = await db
    .select({
      id: attendanceTable.id,
      studentId: attendanceTable.studentId,
      courseId: attendanceTable.courseId,
      date: attendanceTable.date,
      status: attendanceTable.status,
      remarks: attendanceTable.remarks,
      createdAt: attendanceTable.createdAt,
      studentName: usersTable.name,
      rollNumber: studentsTable.rollNumber,
      courseName: coursesTable.name,
    })
    .from(attendanceTable)
    .leftJoin(studentsTable, eq(attendanceTable.studentId, studentsTable.id))
    .leftJoin(usersTable, eq(studentsTable.userId, usersTable.id))
    .leftJoin(coursesTable, eq(attendanceTable.courseId, coursesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  res.json(rows.map(fmtRecord));
});

router.post("/attendance", authenticate, async (req, res): Promise<void> => {
  const parsed = MarkAttendanceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [record] = await db.insert(attendanceTable).values(parsed.data).returning();
  res.status(201).json(fmtRecord(record));
});

router.post("/attendance/bulk", authenticate, async (req, res): Promise<void> => {
  const parsed = BulkMarkAttendanceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { courseId, date, records } = parsed.data;

  const values = records.map((r) => ({
    courseId,
    date,
    studentId: r.studentId,
    status: r.status,
    remarks: r.remarks,
  }));

  await db.insert(attendanceTable).values(values)
    .onConflictDoNothing();

  res.sendStatus(201);
});

router.get("/attendance/summary", authenticate, async (req, res): Promise<void> => {
  const parsed = GetAttendanceSummaryQueryParams.safeParse(req.query);
  const { courseId, studentId, semesterId } = parsed.data ?? {};

  const conditions: ReturnType<typeof eq>[] = [];
  if (courseId) conditions.push(eq(attendanceTable.courseId, Number(courseId)));
  if (studentId) conditions.push(eq(attendanceTable.studentId, Number(studentId)));

  const rows = await db
    .select({
      studentId: attendanceTable.studentId,
      courseId: attendanceTable.courseId,
      status: attendanceTable.status,
      studentName: usersTable.name,
      rollNumber: studentsTable.rollNumber,
      courseName: coursesTable.name,
    })
    .from(attendanceTable)
    .leftJoin(studentsTable, eq(attendanceTable.studentId, studentsTable.id))
    .leftJoin(usersTable, eq(studentsTable.userId, usersTable.id))
    .leftJoin(coursesTable, eq(attendanceTable.courseId, coursesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  // Group by student+course
  const map = new Map<string, { studentId: number; studentName: string; rollNumber: string; courseId: number; courseName: string; total: number; present: number; absent: number }>();
  for (const row of rows) {
    const key = `${row.studentId}-${row.courseId}`;
    if (!map.has(key)) {
      map.set(key, { studentId: row.studentId, studentName: row.studentName ?? "", rollNumber: row.rollNumber ?? "", courseId: row.courseId, courseName: row.courseName ?? "", total: 0, present: 0, absent: 0 });
    }
    const entry = map.get(key)!;
    entry.total++;
    if (row.status === "present" || row.status === "late") entry.present++;
    else entry.absent++;
  }

  const summary = Array.from(map.values()).map((e) => ({
    studentId: e.studentId,
    studentName: e.studentName,
    rollNumber: e.rollNumber,
    courseId: e.courseId,
    courseName: e.courseName,
    totalClasses: e.total,
    presentCount: e.present,
    absentCount: e.absent,
    percentage: e.total > 0 ? Math.round((e.present / e.total) * 100 * 10) / 10 : 0,
  }));

  res.json(summary);
});

export default router;
