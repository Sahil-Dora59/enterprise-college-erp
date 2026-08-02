import { Router, type IRouter } from "express";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { admissionAcademicAssignmentsTable, admissionApplicationsTable, admissionDeliveryQueueTable, admissionDocumentsTable, admissionEventsTable, admissionInterviewsTable, admissionNotificationsTable, admissionTestsTable, applicantAccountsTable, db, departmentsTable, semestersTable, studentsTable, usersTable } from "@workspace/db";
import { authenticate } from "../middlewares/auth";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { hashPassword } from "../lib/password";
import { authenticateApplicant } from "./applicant-auth";

const router: IRouter = Router();
const statuses = ["draft", "submitted", "verification", "review", "approved", "rejected", "waitlisted", "correction_requested"] as const;
const staff = authenticate;
const canReview = (req: any) => ["super_admin", "admin", "secretary", "admission_officer"].includes(req.user?.role);
const documentTypes = ["passport_photo", "signature", "10th_certificate", "12th_certificate", "transfer_certificate", "migration_certificate", "identity_proof", "category_certificate", "income_certificate", "other"];
const storageDir = path.resolve(process.cwd(), "uploads", "admissions");

function view(row: any) {
  return { ...row, submittedAt: row.submittedAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

router.get("/admissions/programs", (_req, res) => res.json([
  { name: "B.Tech Computer Science", eligibility: "10+2 with Mathematics", fee: "₹85,000 / year" },
  { name: "BBA Business Administration", eligibility: "10+2 in any stream", fee: "₹65,000 / year" },
  { name: "B.Com Commerce", eligibility: "10+2 in Commerce or equivalent", fee: "₹55,000 / year" },
]));

router.post("/admissions/applications", async (req, res): Promise<void> => {
  const body = req.body ?? {};
  if (typeof body.applicantName !== "string" || !body.applicantName.trim() || typeof body.email !== "string" || typeof body.program !== "string") {
    res.status(400).json({ error: "Applicant name, email, and program are required." }); return;
  }
  const normalizedEmail = body.email.trim().toLowerCase();
  const [duplicate] = await db.select({ id: admissionApplicationsTable.id }).from(admissionApplicationsTable).where(and(eq(admissionApplicationsTable.email, normalizedEmail), eq(admissionApplicationsTable.program, body.program), or(eq(admissionApplicationsTable.status, "submitted"), eq(admissionApplicationsTable.status, "approved"))));
  if (duplicate) { res.status(409).json({ error: "A submitted application already exists for this email and program." }); return; }
  const [applicant] = await db.select({ id: applicantAccountsTable.id }).from(applicantAccountsTable).where(eq(applicantAccountsTable.email, normalizedEmail));
  const applicationId = `APP-${new Date().getFullYear()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  const referenceNumber = `REF-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
  const [application] = await db.insert(admissionApplicationsTable).values({
    applicationId, referenceNumber, applicantName: body.applicantName.trim(), email: normalizedEmail,
    phone: body.phone ?? "", guardianName: body.guardianName ?? null, guardianPhone: body.guardianPhone ?? null,
    address: body.address ?? null, qualification: body.qualification ?? null, program: body.program,
    documents: body.documents ?? {}, declarationAccepted: Boolean(body.declarationAccepted),
    status: body.submit ? "submitted" : "draft", submittedAt: body.submit ? new Date() : null, applicantId: applicant?.id ?? null,
  }).returning();
  await db.insert(admissionEventsTable).values({ applicationId: application.id, event: body.submit ? "Application submitted" : "Draft saved" });
  await db.insert(admissionNotificationsTable).values({ applicationId: application.id, recipientEmail: application.email, template: body.submit ? "application_submitted" : "draft_saved", subject: body.submit ? "Application submitted" : "Application draft saved", body: `Your application ${application.applicationId} is ${application.status}.` });
  res.status(201).json(view(application));
});

router.get("/admissions/applications/:applicationId/dashboard", async (req, res): Promise<void> => {
  const [application] = await db.select().from(admissionApplicationsTable).where(eq(admissionApplicationsTable.applicationId, req.params.applicationId));
  if (!application) { res.status(404).json({ error: "Application not found" }); return; }
  const [documents, events, interviews, tests, notifications] = await Promise.all([
    db.select().from(admissionDocumentsTable).where(eq(admissionDocumentsTable.applicationId, application.id)),
    db.select().from(admissionEventsTable).where(eq(admissionEventsTable.applicationId, application.id)).orderBy(desc(admissionEventsTable.createdAt)),
    db.select().from(admissionInterviewsTable).where(eq(admissionInterviewsTable.applicationId, application.id)),
    db.select().from(admissionTestsTable).where(eq(admissionTestsTable.applicationId, application.id)),
    db.select().from(admissionNotificationsTable).where(eq(admissionNotificationsTable.applicationId, application.id)).orderBy(desc(admissionNotificationsTable.createdAt)),
  ]);
  const required = ["passport_photo", "signature", "10th_certificate", "12th_certificate", "identity_proof"];
  res.json({ application: view(application), documents, missingDocuments: required.filter((type) => !documents.some((doc) => doc.documentType === type)), events, interviews, tests, notifications });
});

async function assertApplicantOwns(applicationId: string, applicantId: number) {
  const [row] = await db.select().from(admissionApplicationsTable).where(and(eq(admissionApplicationsTable.applicationId, applicationId), eq(admissionApplicationsTable.applicantId, applicantId)));
  return row;
}

router.post("/admissions/applications/:applicationId/documents", async (req, res): Promise<void> => {
  const { documentType, fileName, mimeType, fileData } = req.body ?? {};
  if (!documentTypes.includes(documentType) || typeof fileName !== "string" || typeof mimeType !== "string" || typeof fileData !== "string") { res.status(400).json({ error: "Document type, file name, MIME type, and base64 file data are required." }); return; }
  const buffer = Buffer.from(fileData, "base64");
  if (buffer.length > 5 * 1024 * 1024) { res.status(413).json({ error: "Documents must be 5 MB or smaller." }); return; }
  if (!["image/jpeg", "image/png", "application/pdf"].includes(mimeType)) { res.status(415).json({ error: "Only PDF, JPEG, and PNG documents are supported." }); return; }
  const [application] = await db.select().from(admissionApplicationsTable).where(eq(admissionApplicationsTable.applicationId, req.params.applicationId));
  if (!application) { res.status(404).json({ error: "Application not found" }); return; }
  const [duplicate] = await db.select().from(admissionDocumentsTable).where(and(eq(admissionDocumentsTable.applicationId, application.id), eq(admissionDocumentsTable.documentType, documentType)));
  if (duplicate) { res.status(409).json({ error: "A document of this type already exists. Replace it instead." }); return; }
  await fs.mkdir(storageDir, { recursive: true });
  const storageKey = `${application.applicationId}/${crypto.randomUUID()}-${path.basename(fileName)}`;
  const fullPath = path.join(storageDir, storageKey);
  await fs.mkdir(path.dirname(fullPath), { recursive: true }); await fs.writeFile(fullPath, buffer);
  const [document] = await db.insert(admissionDocumentsTable).values({ applicationId: application.id, documentType, fileName: path.basename(fileName), mimeType, fileSize: buffer.length, storageKey }).returning();
  res.status(201).json(document);
});

router.put("/admissions/applications/:applicationId/documents/:documentType", async (req, res): Promise<void> => {
  const { fileName, mimeType, fileData } = req.body ?? {};
  const [application] = await db.select().from(admissionApplicationsTable).where(eq(admissionApplicationsTable.applicationId, req.params.applicationId));
  if (!application || typeof fileName !== "string" || typeof mimeType !== "string" || typeof fileData !== "string") { res.status(400).json({ error: "Valid application and document payload required." }); return; }
  const buffer = Buffer.from(fileData, "base64");
  if (buffer.length > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "application/pdf"].includes(mimeType)) { res.status(400).json({ error: "Unsupported document or file size." }); return; }
  const [old] = await db.select().from(admissionDocumentsTable).where(and(eq(admissionDocumentsTable.applicationId, application.id), eq(admissionDocumentsTable.documentType, req.params.documentType)));
  if (old) { await db.delete(admissionDocumentsTable).where(eq(admissionDocumentsTable.id, old.id)); await fs.rm(path.join(storageDir, old.storageKey), { force: true }); }
  await fs.mkdir(path.join(storageDir, application.applicationId), { recursive: true });
  const storageKey = `${application.applicationId}/${crypto.randomUUID()}-${path.basename(fileName)}`;
  await fs.writeFile(path.join(storageDir, storageKey), buffer);
  const [document] = await db.insert(admissionDocumentsTable).values({ applicationId: application.id, documentType: req.params.documentType, fileName: path.basename(fileName), mimeType, fileSize: buffer.length, storageKey }).returning();
  res.json(document);
});

router.get("/admissions/documents/:id/download", authenticateApplicant, async (req, res): Promise<void> => {
  const [document] = await db.select().from(admissionDocumentsTable).where(eq(admissionDocumentsTable.id, Number(req.params.id)));
  if (!document) { res.status(404).json({ error: "Document not found" }); return; }
  const [owned] = await db.select({ id: admissionApplicationsTable.id }).from(admissionApplicationsTable).where(and(eq(admissionApplicationsTable.id, document.applicationId), eq(admissionApplicationsTable.applicantId, req.applicantId!)));
  if (!owned && !canReview(req)) { res.status(403).json({ error: "Document access denied" }); return; }
  res.download(path.join(storageDir, document.storageKey), document.fileName);
});

router.delete("/admissions/documents/:id", authenticateApplicant, async (req, res): Promise<void> => {
  const [document] = await db.select().from(admissionDocumentsTable).where(eq(admissionDocumentsTable.id, Number(req.params.id)));
  if (!document) { res.status(404).json({ error: "Document not found" }); return; }
  const [owned] = await db.select({ id: admissionApplicationsTable.id }).from(admissionApplicationsTable).where(and(eq(admissionApplicationsTable.id, document.applicationId), eq(admissionApplicationsTable.applicantId, req.applicantId!)));
  if (!owned) { res.status(403).json({ error: "Document access denied" }); return; }
  await db.delete(admissionDocumentsTable).where(eq(admissionDocumentsTable.id, document.id));
  await fs.rm(path.join(storageDir, document.storageKey), { force: true }); res.sendStatus(204);
});

router.get("/admissions/applications/:applicationId/export.csv", staff, async (req, res): Promise<void> => {
  if (!canReview(req)) { res.status(403).json({ error: "Admission review permission required" }); return; }
  const [application] = await db.select().from(admissionApplicationsTable).where(eq(admissionApplicationsTable.applicationId, String(req.params.applicationId)));
  if (!application) { res.status(404).json({ error: "Application not found" }); return; }
  res.type("text/csv").send(["application_id,reference_number,applicant_name,email,program,status", [application.applicationId, application.referenceNumber, application.applicantName, application.email, application.program, application.status].map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",")].join("\n"));
});

router.get("/admissions/applications/:applicationId/letter", async (req, res): Promise<void> => {
  const [application] = await db.select().from(admissionApplicationsTable).where(eq(admissionApplicationsTable.applicationId, String(req.params.applicationId)));
  if (!application) { res.status(404).json({ error: "Application not found" }); return; }
  const title = application.status === "approved" ? "Offer and Admission Letter" : application.status === "rejected" ? "Admission Decision Letter" : "Admission Status Letter";
  res.json({ referenceNumber: `LETTER-${application.referenceNumber}`, format: "printable-html", title, content: `${title}\n\nApplicant: ${application.applicantName}\nApplication: ${application.applicationId}\nProgram: ${application.program}\nStatus: ${application.status}` });
});

router.get("/admissions/applications/:applicationId", async (req, res): Promise<void> => {
  const [application] = await db.select().from(admissionApplicationsTable).where(eq(admissionApplicationsTable.applicationId, req.params.applicationId));
  if (!application) { res.status(404).json({ error: "Application not found" }); return; }
  const events = await db.select().from(admissionEventsTable).where(eq(admissionEventsTable.applicationId, application.id)).orderBy(desc(admissionEventsTable.createdAt));
  res.json({ application: view(application), events });
});

router.get("/admissions/applications", staff, async (req, res): Promise<void> => {
  if (!canReview(req)) { res.status(403).json({ error: "Admission review permission required" }); return; }
  const q = typeof req.query.search === "string" ? req.query.search : "";
  const status = typeof req.query.status === "string" && statuses.includes(req.query.status as any) ? req.query.status : undefined;
  const conditions = [];
  if (status) conditions.push(eq(admissionApplicationsTable.status, status));
  if (q) conditions.push(or(ilike(admissionApplicationsTable.applicantName, `%${q}%`), ilike(admissionApplicationsTable.applicationId, `%${q}%`), ilike(admissionApplicationsTable.email, `%${q}%`), ilike(admissionApplicationsTable.referenceNumber, `%${q}%`)));
  const rows = await db.select().from(admissionApplicationsTable).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(admissionApplicationsTable.createdAt));
  res.json(rows.map(view));
});

router.patch("/admissions/applications/:id/review", staff, async (req, res): Promise<void> => {
  if (!canReview(req)) { res.status(403).json({ error: "Admission review permission required" }); return; }
  const status = req.body?.status;
  if (!statuses.includes(status)) { res.status(400).json({ error: "Invalid admission status" }); return; }
  const [application] = await db.update(admissionApplicationsTable).set({ status, reviewComment: req.body.comment ?? null, assignedTo: req.body.assignedTo ?? null }).where(eq(admissionApplicationsTable.id, Number(req.params.id))).returning();
  if (!application) { res.status(404).json({ error: "Application not found" }); return; }
  await db.insert(admissionEventsTable).values({ applicationId: application.id, actorId: req.user!.userId, event: `Application ${status}`, comment: req.body.comment ?? null });
  await db.insert(admissionNotificationsTable).values({ applicationId: application.id, recipientEmail: application.email, template: `application_${status}`, subject: `Admission application ${status}`, body: `Your application ${application.applicationId} has been ${status}.` });
  if (status === "approved" && !application.studentUserId) {
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, application.email));
    const [department] = application.departmentId ? await db.select().from(departmentsTable).where(eq(departmentsTable.id, application.departmentId)) : [];
    const [semester] = await db.select().from(semestersTable).limit(1);
    const temporaryPassword = `Nexus@${crypto.randomBytes(4).toString("hex")}`;
    const [studentUser] = existing ? [existing] : await db.insert(usersTable).values({ name: application.applicantName, email: application.email, passwordHash: await hashPassword(temporaryPassword), role: "student", phone: application.phone, mustChangePassword: true }).returning();
    if (semester && department) {
      const [student] = await db.insert(studentsTable).values({ userId: studentUser.id, rollNumber: `ADM-${application.id}`, departmentId: department.id, semesterId: semester.id, admissionDate: new Date().toISOString().slice(0, 10) }).returning();
      await db.update(admissionApplicationsTable).set({ studentUserId: studentUser.id }).where(eq(admissionApplicationsTable.id, application.id));
      await db.insert(admissionEventsTable).values({ applicationId: application.id, actorId: req.user!.userId, event: "Student account created", comment: `Student record ${student.id} created.` });
      await db.insert(admissionNotificationsTable).values({ applicationId: application.id, recipientEmail: application.email, template: "student_account_created", subject: "Student account created", body: "Your student account is ready. A password change is required at first login." });
    }
  }
  res.json(view(application));
});

router.get("/admissions/reports", staff, async (req, res): Promise<void> => {
  if (!canReview(req)) { res.status(403).json({ error: "Admission review permission required" }); return; }
  const rows = await db.select().from(admissionApplicationsTable);
  const byProgram = Object.entries(rows.reduce<Record<string, number>>((acc, row) => { acc[row.program] = (acc[row.program] ?? 0) + 1; return acc; }, {})).map(([program, count]) => ({ program, count }));
  const total = rows.length; const approved = rows.filter((row) => row.status === "approved").length;
  res.json({ total, approved, rejected: rows.filter((row) => row.status === "rejected").length, pending: rows.filter((row) => !["approved", "rejected"].includes(row.status)).length, approvalRate: total ? Math.round(approved / total * 100) : 0, byProgram, funnel: statuses.map((status) => ({ status, count: rows.filter((row) => row.status === status).length })) });
});

router.get("/admissions/analytics", staff, async (req, res): Promise<void> => {
  if (!canReview(req)) { res.status(403).json({ error: "Admission review permission required" }); return; }
  const rows = await db.select().from(admissionApplicationsTable);
  const approved = rows.filter((r) => r.status === "approved").length;
  const byProgram = Object.entries(rows.reduce<Record<string, number>>((a, r) => { a[r.program] = (a[r.program] ?? 0) + 1; return a; }, {})).map(([program, count]) => ({ program, count }));
  res.json({ applications: rows.length, approvals: approved, rejections: rows.filter((r) => r.status === "rejected").length, pending: rows.filter((r) => !["approved", "rejected"].includes(r.status)).length, waitlisted: rows.filter((r) => r.status === "waitlisted").length, conversionRate: rows.length ? Math.round(approved / rows.length * 100) : 0, byProgram, funnel: statuses.map((status) => ({ status, count: rows.filter((r) => r.status === status).length })) });
});

router.post("/admissions/applications/:id/interview", staff, async (req, res): Promise<void> => {
  if (!canReview(req)) { res.status(403).json({ error: "Admission review permission required" }); return; }
  const [interview] = await db.insert(admissionInterviewsTable).values({ applicationId: Number(req.params.id), scheduledAt: new Date(req.body.scheduledAt), mode: req.body.mode ?? "online", status: "scheduled", notes: req.body.notes ?? null }).returning();
  res.status(201).json(interview);
});

router.patch("/admissions/interviews/:id", staff, async (req, res): Promise<void> => {
  if (!canReview(req)) { res.status(403).json({ error: "Admission review permission required" }); return; }
  const [interview] = await db.update(admissionInterviewsTable).set({ status: req.body.status, notes: req.body.notes, result: req.body.result }).where(eq(admissionInterviewsTable.id, Number(req.params.id))).returning();
  if (!interview) { res.status(404).json({ error: "Interview not found" }); return; } res.json(interview);
});

router.post("/admissions/applications/:id/test", staff, async (req, res): Promise<void> => {
  if (!canReview(req)) { res.status(403).json({ error: "Admission review permission required" }); return; }
  const [test] = await db.insert(admissionTestsTable).values({ applicationId: Number(req.params.id), scheduledAt: new Date(req.body.scheduledAt), testCenter: req.body.testCenter ?? null, seatNumber: req.body.seatNumber ?? null }).returning();
  res.status(201).json(test);
});

router.patch("/admissions/tests/:id", staff, async (req, res): Promise<void> => {
  if (!canReview(req)) { res.status(403).json({ error: "Admission review permission required" }); return; }
  const [test] = await db.update(admissionTestsTable).set({ score: req.body.score == null ? null : Number(req.body.score), result: req.body.result, eligibilityDecision: req.body.eligibilityDecision }).where(eq(admissionTestsTable.id, Number(req.params.id))).returning();
  if (!test) { res.status(404).json({ error: "Test not found" }); return; } res.json(test);
});

router.get("/admissions/academic-assignments", staff, async (req, res): Promise<void> => {
  if (!canReview(req)) { res.status(403).json({ error: "Admission review permission required" }); return; }
  res.json(await db.select().from(admissionAcademicAssignmentsTable).where(eq(admissionAcademicAssignmentsTable.status, "pending")));
});

router.post("/admissions/applications/:id/academic-assignment", staff, async (req, res): Promise<void> => {
  if (!canReview(req)) { res.status(403).json({ error: "Admission review permission required" }); return; }
  const [assignment] = await db.insert(admissionAcademicAssignmentsTable).values({ applicationId: Number(req.params.id), departmentId: req.body.departmentId ?? null, courseId: req.body.courseId ?? null, semesterId: req.body.semesterId ?? null, academicSession: req.body.academicSession ?? null, notes: req.body.notes ?? null }).returning();
  res.status(201).json(assignment);
});

router.post("/admissions/delivery-queue", staff, async (req, res): Promise<void> => {
  if (!canReview(req)) { res.status(403).json({ error: "Admission review permission required" }); return; }
  const [item] = await db.insert(admissionDeliveryQueueTable).values({ applicationId: req.body.applicationId ?? null, channel: req.body.channel, template: req.body.template, recipient: req.body.recipient, payload: req.body.payload ?? {} }).returning();
  res.status(201).json(item);
});

export default router;