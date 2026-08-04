import { Router, type IRouter } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, usersTable, parentStudentLinksTable, parentMessagesTable, parentAppointmentsTable, parentLeaveRequestsTable, parentNotificationsTable, studentsTable, attendanceTable, feeRecordsTable, assignmentsTable, examinationsTable, noticesTable, authSessionsTable } from "@workspace/db";
import { authenticate } from "../middlewares/auth";
import { hashPassword, verifyPassword } from "../lib/password";
import { signToken, TOKEN_TTL_SECONDS } from "../lib/jwt";
import crypto from "node:crypto";

const router: IRouter = Router();
const parentOnly = (req: any, res: any, next: any) => {
  if (req.user?.role !== "parent") { res.status(403).json({ error: "Parent access required" }); return; }
  next();
};

router.post("/parents/register", async (req, res) => {
  const { name, email, password, studentEmail, studentId, relationship } = req.body ?? {};
  if (!name || !email || !password || (!studentEmail && !studentId)) { res.status(400).json({ error: "Name, email, password, and a student link are required" }); return; }
  const normalized = String(email).trim().toLowerCase();
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, normalized));
  if (existing) { res.status(409).json({ error: "An account already exists for this email" }); return; }
  const [student] = studentId
    ? await db.select({ userId: studentsTable.userId }).from(studentsTable).where(eq(studentsTable.id, Number(studentId)))
    : await db.select({ userId: usersTable.id }).from(usersTable).where(and(eq(usersTable.email, String(studentEmail).trim().toLowerCase()), eq(usersTable.role, "student")));
  if (!student) { res.status(404).json({ error: "Student link could not be verified" }); return; }
  const [parent] = await db.insert(usersTable).values({ name: String(name).trim(), email: normalized, passwordHash: await hashPassword(String(password)), role: "parent", isActive: true }).returning();
  await db.insert(parentStudentLinksTable).values({ parentUserId: parent.id, studentUserId: student.userId, relationship: relationship || "parent" });
  res.status(201).json({ user: { id: parent.id, name: parent.name, email: parent.email, role: parent.role } });
});

router.post("/parents/login", async (req, res) => {
  const [parent] = await db.select().from(usersTable).where(and(eq(usersTable.email, String(req.body?.email ?? "").trim().toLowerCase()), eq(usersTable.role, "parent")));
  if (!parent || !(await verifyPassword(String(req.body?.password ?? ""), parent.passwordHash))) { res.status(401).json({ error: "Invalid parent credentials" }); return; }
  const tokenId = crypto.randomUUID();
  const token = signToken({ userId: parent.id, email: parent.email, role: parent.role }, tokenId);
  await db.insert(authSessionsTable).values({ userId: parent.id, tokenId, expiresAt: new Date(Date.now() + TOKEN_TTL_SECONDS * 1000) });
  res.json({ token, user: { id: parent.id, name: parent.name, email: parent.email, role: parent.role }, expiresIn: TOKEN_TTL_SECONDS });
});

router.get("/parents/students", authenticate, parentOnly, async (req, res) => {
  const rows = await db.select({ link: parentStudentLinksTable, student: studentsTable, user: usersTable })
    .from(parentStudentLinksTable)
    .innerJoin(studentsTable, eq(parentStudentLinksTable.studentUserId, studentsTable.userId))
    .innerJoin(usersTable, eq(studentsTable.userId, usersTable.id))
    .where(and(eq(parentStudentLinksTable.parentUserId, req.user!.userId), eq(parentStudentLinksTable.status, "active")));
  res.json(rows);
});

router.get("/parents/dashboard/:studentId", authenticate, parentOnly, async (req, res) => {
  const studentUserId = Number(req.params.studentId);
  const [link] = await db.select().from(parentStudentLinksTable).where(and(eq(parentStudentLinksTable.parentUserId, req.user!.userId), eq(parentStudentLinksTable.studentUserId, studentUserId), eq(parentStudentLinksTable.status, "active")));
  if (!link) { res.status(403).json({ error: "Student is not linked to this parent" }); return; }
  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.userId, studentUserId));
  if (!student) { res.status(404).json({ error: "Student not found" }); return; }
  const [attendance, fees, assignments, exams, notices, user] = await Promise.all([
    db.select({ total: sql<number>`count(*)::int`, present: sql<number>`count(*) filter (where ${attendanceTable.status} = 'present')::int` }).from(attendanceTable).where(eq(attendanceTable.studentId, student.id)),
    db.select({ amount: feeRecordsTable.amount, paidAmount: feeRecordsTable.paidAmount, status: feeRecordsTable.status }).from(feeRecordsTable).where(eq(feeRecordsTable.studentId, student.id)),
    db.select().from(assignmentsTable).where(eq(assignmentsTable.status, "active")).limit(8),
    db.select().from(examinationsTable).where(eq(examinationsTable.semesterId, student.semesterId)).limit(8),
    db.select().from(noticesTable).where(eq(noticesTable.isActive, true)).orderBy(desc(noticesTable.publishedAt)).limit(8),
    db.select({ name: usersTable.name, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, studentUserId)),
  ]);
  const total = fees.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const paid = fees.reduce((sum, row) => sum + Number(row.paidAmount || 0), 0);
  res.json({ student: { ...student, ...user }, attendance: { total: attendance[0]?.total ?? 0, present: attendance[0]?.present ?? 0, percentage: attendance[0]?.total ? Math.round((attendance[0].present / attendance[0].total) * 1000) / 10 : 0 }, fees: { total, paid, outstanding: Math.max(0, total - paid), history: fees }, assignments, exams, notices });
});
const linked = async (parentId: number, studentId: number) => { const [row] = await db.select().from(parentStudentLinksTable).where(and(eq(parentStudentLinksTable.parentUserId, parentId), eq(parentStudentLinksTable.studentUserId, studentId), eq(parentStudentLinksTable.status, "active"))); return row; };
router.get("/parents/messages", authenticate, parentOnly, async (req, res) => res.json(await db.select().from(parentMessagesTable).where(eq(parentMessagesTable.parentUserId, req.user!.userId)).orderBy(desc(parentMessagesTable.createdAt))));
router.post("/parents/messages", authenticate, parentOnly, async (req, res) => { const studentId = Number(req.body.studentId); if (!(await linked(req.user!.userId, studentId))) { res.status(403).json({ error: "Student is not linked" }); return; } const [row] = await db.insert(parentMessagesTable).values({ parentUserId: req.user!.userId, studentUserId: studentId, recipientUserId: req.body.recipientUserId ? Number(req.body.recipientUserId) : null, body: String(req.body.body ?? "").trim(), category: req.body.category ?? "faculty" }).returning(); res.status(201).json(row); });
router.get("/parents/appointments", authenticate, parentOnly, async (req, res) => res.json(await db.select().from(parentAppointmentsTable).where(eq(parentAppointmentsTable.parentUserId, req.user!.userId)).orderBy(desc(parentAppointmentsTable.scheduledAt))));
router.post("/parents/appointments", authenticate, parentOnly, async (req, res) => { const studentId = Number(req.body.studentId); if (!(await linked(req.user!.userId, studentId))) { res.status(403).json({ error: "Student is not linked" }); return; } const [row] = await db.insert(parentAppointmentsTable).values({ parentUserId: req.user!.userId, studentUserId: studentId, recipientUserId: req.body.recipientUserId ? Number(req.body.recipientUserId) : null, scheduledAt: new Date(req.body.scheduledAt), purpose: String(req.body.purpose ?? "").trim() }).returning(); res.status(201).json(row); });
router.get("/parents/leave", authenticate, parentOnly, async (req, res) => res.json(await db.select().from(parentLeaveRequestsTable).where(eq(parentLeaveRequestsTable.parentUserId, req.user!.userId)).orderBy(desc(parentLeaveRequestsTable.createdAt))));
router.post("/parents/leave", authenticate, parentOnly, async (req, res) => { const studentId = Number(req.body.studentId); if (!(await linked(req.user!.userId, studentId))) { res.status(403).json({ error: "Student is not linked" }); return; } const [row] = await db.insert(parentLeaveRequestsTable).values({ parentUserId: req.user!.userId, studentUserId: studentId, fromDate: new Date(req.body.fromDate), toDate: new Date(req.body.toDate), reason: String(req.body.reason ?? "").trim() }).returning(); res.status(201).json(row); });
router.get("/parents/notifications", authenticate, parentOnly, async (req, res) => res.json(await db.select().from(parentNotificationsTable).where(eq(parentNotificationsTable.parentUserId, req.user!.userId)).orderBy(desc(parentNotificationsTable.createdAt))));
router.patch("/parents/notifications/:id", authenticate, parentOnly, async (req, res) => { const [row] = await db.update(parentNotificationsTable).set({ status: req.body.status ?? "read" }).where(and(eq(parentNotificationsTable.id, Number(req.params.id)), eq(parentNotificationsTable.parentUserId, req.user!.userId))).returning(); res.json(row ?? null); });
const resetTokens = new Map<string, { userId: number; expiresAt: number }>();
router.post("/parents/forgot-password", async (req, res) => { const [parent] = await db.select().from(usersTable).where(and(eq(usersTable.email, String(req.body?.email ?? "").trim().toLowerCase()), eq(usersTable.role, "parent"))); if (parent) resetTokens.set(crypto.randomBytes(24).toString("hex"), { userId: parent.id, expiresAt: Date.now() + 15 * 60 * 1000 }); res.json({ message: "If the parent account exists, reset instructions have been queued." }); });
router.post("/parents/reset-password", async (req, res) => { const entry = resetTokens.get(String(req.body?.token ?? "")); const password = String(req.body?.password ?? ""); if (!entry || entry.expiresAt < Date.now() || password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) { res.status(400).json({ error: "Reset token is invalid or password is too weak." }); return; } await db.update(usersTable).set({ passwordHash: await hashPassword(password) }).where(eq(usersTable.id, entry.userId)); resetTokens.delete(String(req.body.token)); res.json({ message: "Parent password reset successfully." }); });

export default router;