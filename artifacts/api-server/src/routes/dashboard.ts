import { Router, type IRouter } from "express";
import { eq, sql, gte } from "drizzle-orm";
import { db, usersTable, studentsTable, facultyTable, coursesTable, departmentsTable, semestersTable, feeRecordsTable, booksTable, attendanceTable, noticesTable, examinationsTable, activityLogTable } from "@workspace/db";
import { authenticate } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/dashboard/stats", authenticate, async (_req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];

  const [
    [{ totalStudents }],
    [{ totalFaculty }],
    [{ totalCourses }],
    [{ totalDepartments }],
    [{ activeSemesters }],
    [{ pendingFees }],
    [{ totalBooks }],
    [{ recentNotices }],
    [{ upcomingExams }],
    attendanceToday,
  ] = await Promise.all([
    db.select({ totalStudents: sql<number>`count(*)::int` }).from(studentsTable),
    db.select({ totalFaculty: sql<number>`count(*)::int` }).from(facultyTable),
    db.select({ totalCourses: sql<number>`count(*)::int` }).from(coursesTable),
    db.select({ totalDepartments: sql<number>`count(*)::int` }).from(departmentsTable),
    db.select({ activeSemesters: sql<number>`count(*)::int` }).from(semestersTable).where(eq(semestersTable.isActive, true)),
    db.select({ pendingFees: sql<number>`coalesce(sum(${feeRecordsTable.amount}::numeric - coalesce(${feeRecordsTable.paidAmount}::numeric, 0)), 0)::float` }).from(feeRecordsTable).where(sql`${feeRecordsTable.status} != 'paid'`),
    db.select({ totalBooks: sql<number>`count(*)::int` }).from(booksTable),
    db.select({ recentNotices: sql<number>`count(*)::int` }).from(noticesTable).where(eq(noticesTable.isActive, true)),
    db.select({ upcomingExams: sql<number>`count(*)::int` }).from(examinationsTable).where(sql`${examinationsTable.examDate} >= ${today}`),
    db.select({ status: attendanceTable.status, count: sql<number>`count(*)::int` }).from(attendanceTable).where(eq(attendanceTable.date, today)).groupBy(attendanceTable.status),
  ]);

  const totalAttendance = attendanceToday.reduce((s, r) => s + r.count, 0);
  const presentCount = attendanceToday.filter((r) => r.status === "present" || r.status === "late").reduce((s, r) => s + r.count, 0);
  const todayAttendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100 * 10) / 10 : 0;

  res.json({ totalStudents, totalFaculty, totalCourses, totalDepartments, activeSemesters, pendingFees, totalBooks, todayAttendanceRate, recentNotices, upcomingExams });
});

router.get("/dashboard/recent-activity", authenticate, async (_req, res): Promise<void> => {
  const rows = await db.select().from(activityLogTable).orderBy(sql`${activityLogTable.timestamp} desc`).limit(20);
  res.json(rows.map((r) => ({ ...r, timestamp: r.timestamp.toISOString(), createdAt: r.createdAt.toISOString() })));
});

router.get("/dashboard/enrollment-chart", authenticate, async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      label: departmentsTable.name,
      value: sql<number>`count(${studentsTable.id})::int`,
    })
    .from(departmentsTable)
    .leftJoin(studentsTable, eq(studentsTable.departmentId, departmentsTable.id))
    .groupBy(departmentsTable.id, departmentsTable.name);

  res.json(rows.map((r) => ({ label: r.label, value: r.value, secondaryValue: null })));
});

router.get("/dashboard/fee-collection-chart", authenticate, async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      label: semestersTable.name,
      value: sql<number>`coalesce(sum(${feeRecordsTable.paidAmount}::numeric), 0)::float`,
      secondaryValue: sql<number>`coalesce(sum(${feeRecordsTable.amount}::numeric), 0)::float`,
    })
    .from(semestersTable)
    .leftJoin(feeRecordsTable, eq(feeRecordsTable.semesterId, semestersTable.id))
    .groupBy(semestersTable.id, semestersTable.name)
    .orderBy(semestersTable.startDate);

  res.json(rows);
});

router.get("/dashboard/attendance-overview", authenticate, async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      label: attendanceTable.status,
      value: sql<number>`count(*)::int`,
    })
    .from(attendanceTable)
    .groupBy(attendanceTable.status);

  res.json(rows.map((r) => ({ label: r.label, value: r.value, secondaryValue: null })));
});

export default router;
