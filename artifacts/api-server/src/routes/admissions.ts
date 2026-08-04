import { Router, type IRouter } from "express";
import { and, desc, eq, ilike, or, ne, sql } from "drizzle-orm";
import {
  admissionAcademicAssignmentsTable, admissionApplicationsTable, admissionDeliveryQueueTable,
  admissionDocumentsTable, admissionEventsTable, admissionInterviewsTable,
  admissionNotificationsTable, admissionTestsTable, applicantAccountsTable,
  db, departmentsTable, semestersTable, studentsTable, usersTable,
} from "@workspace/db";
import { authenticate } from "../middlewares/auth";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { hashPassword } from "../lib/password";
import { authenticateApplicant } from "./applicant-auth";
import { generateAssistantResponse } from "../services/aiService";

const router: IRouter = Router();
const statuses = ["draft", "submitted", "verification", "review", "approved", "rejected", "waitlisted", "correction_requested"] as const;
const staff = authenticate;
const canReview = (req: any) => ["super_admin", "admin", "secretary", "admission_officer"].includes(req.user?.role);
const documentTypes = ["passport_photo", "signature", "10th_certificate", "12th_certificate", "transfer_certificate", "migration_certificate", "identity_proof", "category_certificate", "income_certificate", "other"];
const storageDir = path.resolve(process.cwd(), "uploads", "admissions");

function view(row: any) {
  return { ...row, submittedAt: row.submittedAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

// ─── Programs ────────────────────────────────────────────────────────────────
router.get("/admissions/programs", (_req, res) => res.json([
  { name: "B.Tech Computer Science", eligibility: "10+2 with Mathematics", fee: "₹85,000 / year", duration: "4 years" },
  { name: "BBA Business Administration", eligibility: "10+2 in any stream", fee: "₹65,000 / year", duration: "3 years" },
  { name: "B.Com Commerce", eligibility: "10+2 in Commerce or equivalent", fee: "₹55,000 / year", duration: "3 years" },
  { name: "B.Sc Data Science", eligibility: "10+2 with Mathematics", fee: "₹75,000 / year", duration: "3 years" },
  { name: "MBA", eligibility: "Any bachelor's degree", fee: "₹1,20,000 / year", duration: "2 years" },
]));

// ─── Submit / draft application ───────────────────────────────────────────────
router.post("/admissions/applications", async (req, res): Promise<void> => {
  const body = req.body ?? {};
  if (typeof body.applicantName !== "string" || !body.applicantName.trim() || typeof body.email !== "string" || typeof body.program !== "string") {
    res.status(400).json({ error: "Applicant name, email, and program are required." }); return;
  }
  const normalizedEmail = body.email.trim().toLowerCase();
  const [duplicate] = await db.select({ id: admissionApplicationsTable.id }).from(admissionApplicationsTable)
    .where(and(eq(admissionApplicationsTable.email, normalizedEmail), eq(admissionApplicationsTable.program, body.program),
      or(eq(admissionApplicationsTable.status, "submitted"), eq(admissionApplicationsTable.status, "approved"))));
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
  if (body.submit) {
    await db.insert(admissionNotificationsTable).values({ applicationId: application.id, recipientEmail: application.email, template: "application_submitted", subject: "Application submitted successfully", body: `Your application ${application.applicationId} has been received. Reference: ${application.referenceNumber}` });
    await db.insert(admissionDeliveryQueueTable).values({ applicationId: application.id, channel: "email", template: "application_submitted", recipient: application.email, payload: { applicantName: application.applicantName, applicationId: application.applicationId, referenceNumber: application.referenceNumber } });
  }
  res.status(201).json(view(application));
});

// ─── Applicant dashboard ──────────────────────────────────────────────────────
router.get("/admissions/applications/:applicationId/dashboard", async (req, res): Promise<void> => {
  const [application] = await db.select().from(admissionApplicationsTable).where(eq(admissionApplicationsTable.applicationId, String(req.params.applicationId)));
  if (!application) { res.status(404).json({ error: "Application not found" }); return; }
  const [documents, events, interviews, tests, notifications, academicAssignments] = await Promise.all([
    db.select().from(admissionDocumentsTable).where(eq(admissionDocumentsTable.applicationId, application.id)).orderBy(desc(admissionDocumentsTable.createdAt)),
    db.select().from(admissionEventsTable).where(eq(admissionEventsTable.applicationId, application.id)).orderBy(desc(admissionEventsTable.createdAt)),
    db.select().from(admissionInterviewsTable).where(eq(admissionInterviewsTable.applicationId, application.id)).orderBy(desc(admissionInterviewsTable.scheduledAt)),
    db.select().from(admissionTestsTable).where(eq(admissionTestsTable.applicationId, application.id)).orderBy(desc(admissionTestsTable.scheduledAt)),
    db.select().from(admissionNotificationsTable).where(eq(admissionNotificationsTable.applicationId, application.id)).orderBy(desc(admissionNotificationsTable.createdAt)),
    db.select().from(admissionAcademicAssignmentsTable).where(eq(admissionAcademicAssignmentsTable.applicationId, application.id)),
  ]);
  const required = ["passport_photo", "signature", "10th_certificate", "12th_certificate", "identity_proof"];
  const profileFields = ["applicantName", "email", "phone", "guardianName", "guardianPhone", "address", "qualification", "program", "declarationAccepted"];
  const filledFields = profileFields.filter((f) => Boolean((application as any)[f])).length;
  const profileCompletion = Math.round((filledFields / profileFields.length) * 100);
  res.json({ application: view(application), documents, missingDocuments: required.filter((type) => !documents.some((doc) => doc.documentType === type)), events, interviews, tests, notifications, academicAssignments, profileCompletion });
});

// ─── Applicant profile update ─────────────────────────────────────────────────
router.patch("/admissions/applications/:applicationId/profile", authenticateApplicant, async (req, res): Promise<void> => {
  const applicantId = req.applicantId!;
  const [application] = await db.select().from(admissionApplicationsTable)
    .where(and(eq(admissionApplicationsTable.applicationId, String(req.params.applicationId)), eq(admissionApplicationsTable.applicantId, applicantId)));
  if (!application) { res.status(404).json({ error: "Application not found or access denied." }); return; }
  const allowed = ["applicantName", "phone", "guardianName", "guardianPhone", "address", "qualification", "declarationAccepted"] as const;
  const updates: Record<string, any> = {};
  for (const field of allowed) { if (req.body[field] !== undefined) updates[field] = req.body[field]; }
  const [updated] = await db.update(admissionApplicationsTable).set(updates).where(eq(admissionApplicationsTable.id, application.id)).returning();
  await db.insert(admissionEventsTable).values({ applicationId: application.id, event: "Profile updated" });
  res.json(view(updated));
});

// ─── Document upload (base64 + progress via XHR) ─────────────────────────────
router.post("/admissions/applications/:applicationId/documents", async (req, res): Promise<void> => {
  const { documentType, fileName, mimeType, fileData } = req.body ?? {};
  if (!documentTypes.includes(documentType) || typeof fileName !== "string" || typeof mimeType !== "string" || typeof fileData !== "string") {
    res.status(400).json({ error: "Document type, file name, MIME type, and base64 file data are required." }); return;
  }
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(fileData) || fileData.length % 4 !== 0) {
    res.status(400).json({ error: "Invalid base64 document data." }); return;
  }
  const buffer = Buffer.from(fileData, "base64");
  if (buffer.length > 5 * 1024 * 1024) { res.status(413).json({ error: "Documents must be 5 MB or smaller." }); return; }
  if (!["image/jpeg", "image/png", "application/pdf"].includes(mimeType)) { res.status(415).json({ error: "Only PDF, JPEG, and PNG documents are supported." }); return; }
  const safeName = path.basename(fileName).replace(/[^\w.\- ]/g, "_").slice(0, 180);
  if (!safeName || safeName === "." || safeName === "..") { res.status(400).json({ error: "Invalid file name." }); return; }
  const validSignature =
    (mimeType === "application/pdf" && buffer.subarray(0, 5).toString() === "%PDF-") ||
    (mimeType === "image/png" && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
    (mimeType === "image/jpeg" && buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255])));
  if (!validSignature) { res.status(415).json({ error: "Document content does not match its declared type." }); return; }
  const [application] = await db.select().from(admissionApplicationsTable).where(eq(admissionApplicationsTable.applicationId, String(req.params.applicationId)));
  if (!application) { res.status(404).json({ error: "Application not found" }); return; }
  const [duplicate] = await db.select().from(admissionDocumentsTable).where(and(eq(admissionDocumentsTable.applicationId, application.id), eq(admissionDocumentsTable.documentType, documentType)));
  if (duplicate) { res.status(409).json({ error: "A document of this type already exists. Use the replace endpoint instead." }); return; }
  await fs.mkdir(storageDir, { recursive: true });
  const storageKey = `${application.applicationId}/${crypto.randomUUID()}-${safeName}`;
  const fullPath = path.join(storageDir, storageKey);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, buffer);
  const [document] = await db.insert(admissionDocumentsTable).values({ applicationId: application.id, documentType, fileName: safeName, mimeType, fileSize: buffer.length, storageKey }).returning();
  await db.insert(admissionEventsTable).values({ applicationId: application.id, event: `Document uploaded: ${documentType}` });
  res.status(201).json(document);
});

// ─── Document replace ─────────────────────────────────────────────────────────
router.put("/admissions/applications/:applicationId/documents/:documentType", async (req, res): Promise<void> => {
  const { fileName, mimeType, fileData } = req.body ?? {};
  const [application] = await db.select().from(admissionApplicationsTable).where(eq(admissionApplicationsTable.applicationId, String(req.params.applicationId)));
  if (!application || typeof fileName !== "string" || typeof mimeType !== "string" || typeof fileData !== "string") {
    res.status(400).json({ error: "Valid application and document payload required." }); return;
  }
  const buffer = Buffer.from(fileData, "base64");
  if (buffer.length > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "application/pdf"].includes(mimeType)) {
    res.status(400).json({ error: "Unsupported document or file size." }); return;
  }
  const [old] = await db.select().from(admissionDocumentsTable).where(and(eq(admissionDocumentsTable.applicationId, application.id), eq(admissionDocumentsTable.documentType, String(req.params.documentType))));
  if (old) {
    await db.delete(admissionDocumentsTable).where(eq(admissionDocumentsTable.id, old.id));
    await fs.rm(path.join(storageDir, old.storageKey), { force: true });
  }
  await fs.mkdir(path.join(storageDir, application.applicationId), { recursive: true });
  const storageKey = `${application.applicationId}/${crypto.randomUUID()}-${path.basename(fileName)}`;
  await fs.writeFile(path.join(storageDir, storageKey), buffer);
  const [document] = await db.insert(admissionDocumentsTable).values({ applicationId: application.id, documentType: req.params.documentType, fileName: path.basename(fileName), mimeType, fileSize: buffer.length, storageKey }).returning();
  await db.insert(admissionEventsTable).values({ applicationId: application.id, event: `Document replaced: ${req.params.documentType}` });
  res.json(document);
});

// ─── Document download (ownership enforced) ───────────────────────────────────
router.get("/admissions/documents/:id/download", authenticateApplicant, async (req, res): Promise<void> => {
  const [document] = await db.select().from(admissionDocumentsTable).where(eq(admissionDocumentsTable.id, Number(req.params.id)));
  if (!document) { res.status(404).json({ error: "Document not found" }); return; }
  const applicantId = req.applicantId!;
  const [owned] = await db.select({ id: admissionApplicationsTable.id }).from(admissionApplicationsTable)
    .where(and(eq(admissionApplicationsTable.id, document.applicationId), eq(admissionApplicationsTable.applicantId, applicantId)));
  if (!owned && !canReview(req)) { res.status(403).json({ error: "Document access denied" }); return; }
  const filePath = path.join(storageDir, document.storageKey);
  try { await fs.access(filePath); } catch { res.status(404).json({ error: "File not found on storage" }); return; }
  res.download(filePath, document.fileName);
});

// ─── Document delete (ownership enforced) ─────────────────────────────────────
router.delete("/admissions/documents/:id", authenticateApplicant, async (req, res): Promise<void> => {
  const [document] = await db.select().from(admissionDocumentsTable).where(eq(admissionDocumentsTable.id, Number(req.params.id)));
  if (!document) { res.status(404).json({ error: "Document not found" }); return; }
  const applicantId = req.applicantId!;
  const [owned] = await db.select({ id: admissionApplicationsTable.id }).from(admissionApplicationsTable)
    .where(and(eq(admissionApplicationsTable.id, document.applicationId), eq(admissionApplicationsTable.applicantId, applicantId)));
  if (!owned) { res.status(403).json({ error: "Document access denied" }); return; }
  await db.delete(admissionDocumentsTable).where(eq(admissionDocumentsTable.id, document.id));
  await fs.rm(path.join(storageDir, document.storageKey), { force: true });
  res.sendStatus(204);
});

// ─── Document verification (staff) ───────────────────────────────────────────
router.patch("/admissions/documents/:id/verify", staff, async (req, res): Promise<void> => {
  if (!canReview(req)) { res.status(403).json({ error: "Admission review permission required" }); return; }
  const status = req.body?.status;
  if (!["verified", "pending", "rejected"].includes(status)) { res.status(400).json({ error: "Status must be verified, pending, or rejected." }); return; }
  const [document] = await db.update(admissionDocumentsTable)
    .set({ verificationStatus: status, reviewerComment: req.body.comment ?? null, reviewedBy: req.user!.userId, reviewedAt: new Date() })
    .where(eq(admissionDocumentsTable.id, Number(req.params.id))).returning();
  if (!document) { res.status(404).json({ error: "Document not found" }); return; }
  res.json(document);
});

// ─── Single application lookup ─────────────────────────────────────────────────
router.get("/admissions/applications/:applicationId", async (req, res): Promise<void> => {
  const [application] = await db.select().from(admissionApplicationsTable).where(eq(admissionApplicationsTable.applicationId, String(req.params.applicationId)));
  if (!application) { res.status(404).json({ error: "Application not found" }); return; }
  const events = await db.select().from(admissionEventsTable).where(eq(admissionEventsTable.applicationId, application.id)).orderBy(desc(admissionEventsTable.createdAt));
  res.json({ application: view(application), events });
});

// ─── CRM list ─────────────────────────────────────────────────────────────────
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

// ─── Review / status update + student creation ────────────────────────────────
router.patch("/admissions/applications/:id/review", staff, async (req, res): Promise<void> => {
  if (!canReview(req)) { res.status(403).json({ error: "Admission review permission required" }); return; }
  const status = req.body?.status;
  if (!statuses.includes(status)) { res.status(400).json({ error: "Invalid admission status" }); return; }
  const [application] = await db.update(admissionApplicationsTable)
    .set({ status, reviewComment: req.body.comment ?? null, assignedTo: req.body.assignedTo ?? null })
    .where(eq(admissionApplicationsTable.id, Number(req.params.id))).returning();
  if (!application) { res.status(404).json({ error: "Application not found" }); return; }
  await db.insert(admissionEventsTable).values({ applicationId: application.id, actorId: req.user!.userId, event: `Application ${status}`, comment: req.body.comment ?? null });
  await db.insert(admissionNotificationsTable).values({ applicationId: application.id, recipientEmail: application.email, template: `application_${status}`, subject: `Admission application ${status}`, body: `Your application ${application.applicationId} has been ${status}.` });
  await db.insert(admissionDeliveryQueueTable).values({ applicationId: application.id, channel: "email", template: `application_${status}`, recipient: application.email, payload: { applicantName: application.applicantName, applicationId: application.applicationId, status } });

  if (status === "approved" && !application.studentUserId) {
    // Prevent duplicate student accounts
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, application.email));
    const [department] = application.departmentId ? await db.select().from(departmentsTable).where(eq(departmentsTable.id, application.departmentId)) : [];
    const [semester] = await db.select().from(semestersTable).limit(1);
    const temporaryPassword = `Nexus@${crypto.randomBytes(4).toString("hex")}`;
    const [studentUser] = existing ? [existing] : await db.insert(usersTable).values({ name: application.applicantName, email: application.email, passwordHash: await hashPassword(temporaryPassword), role: "student", phone: application.phone, mustChangePassword: true }).returning();

    if (semester && department) {
      // Check for duplicate student record
      const [existingStudent] = await db.select().from(studentsTable).where(eq(studentsTable.userId, studentUser.id));
      if (!existingStudent) {
        const rollNumber = `ADM-${new Date().getFullYear()}-${String(application.id).padStart(5, "0")}`;
        const [student] = await db.insert(studentsTable).values({ userId: studentUser.id, rollNumber, departmentId: department.id, semesterId: semester.id, admissionDate: new Date().toISOString().slice(0, 10) }).returning();
        await db.update(admissionApplicationsTable).set({ studentUserId: studentUser.id }).where(eq(admissionApplicationsTable.id, application.id));
        await db.insert(admissionEventsTable).values({ applicationId: application.id, actorId: req.user!.userId, event: "Student account created", comment: `Roll: ${student.rollNumber}` });
        await db.insert(admissionNotificationsTable).values({ applicationId: application.id, recipientEmail: application.email, template: "student_account_created", subject: "Your student account is ready", body: `Welcome! Your student account has been created. Roll number: ${student.rollNumber}. Please log in and change your password.` });
      }
    } else {
      // Fallback: create pending academic assignment queue entry
      const [existingAssignment] = await db.select().from(admissionAcademicAssignmentsTable).where(eq(admissionAcademicAssignmentsTable.applicationId, application.id));
      if (!existingAssignment) {
        await db.insert(admissionAcademicAssignmentsTable).values({ applicationId: application.id, departmentId: application.departmentId ?? null, notes: "Auto-created: department or semester mapping unavailable at time of approval." });
        await db.insert(admissionEventsTable).values({ applicationId: application.id, actorId: req.user!.userId, event: "Pending academic assignment created", comment: "Department or semester mapping unavailable. Student record queued for completion." });
        await db.insert(admissionNotificationsTable).values({ applicationId: application.id, recipientEmail: application.email, template: "pending_academic_assignment", subject: "Admission approved – academic assignment pending", body: `Your application has been approved. Academic assignment is being processed and you will be notified once your student account is ready.` });
      }
      await db.update(admissionApplicationsTable).set({ studentUserId: studentUser.id }).where(eq(admissionApplicationsTable.id, application.id));
    }
  }
  res.json(view(application));
});

// ─── Complete academic assignment ─────────────────────────────────────────────
router.patch("/admissions/academic-assignments/:id/complete", staff, async (req, res): Promise<void> => {
  if (!canReview(req)) { res.status(403).json({ error: "Admission review permission required" }); return; }
  const [assignment] = await db.update(admissionAcademicAssignmentsTable)
    .set({ departmentId: req.body.departmentId, semesterId: req.body.semesterId, courseId: req.body.courseId ?? null, academicSession: req.body.academicSession ?? null, status: "completed", completedAt: new Date(), completedBy: req.user!.userId, notes: req.body.notes ?? null })
    .where(eq(admissionAcademicAssignmentsTable.id, Number(req.params.id))).returning();
  if (!assignment) { res.status(404).json({ error: "Assignment not found" }); return; }
  // Try to create student record now that mapping is available
  const [application] = await db.select().from(admissionApplicationsTable).where(eq(admissionApplicationsTable.id, assignment.applicationId));
  if (application && assignment.departmentId && assignment.semesterId) {
    const [existingStudent] = await db.select().from(studentsTable).where(eq(studentsTable.userId, application.studentUserId ?? -1));
    if (!existingStudent && application.studentUserId) {
      const rollNumber = `ADM-${new Date().getFullYear()}-${String(application.id).padStart(5, "0")}`;
      const [student] = await db.insert(studentsTable).values({ userId: application.studentUserId, rollNumber, departmentId: assignment.departmentId, semesterId: assignment.semesterId, admissionDate: new Date().toISOString().slice(0, 10) }).returning();
      await db.insert(admissionEventsTable).values({ applicationId: application.id, actorId: req.user!.userId, event: "Student record completed", comment: `Roll: ${student.rollNumber}` });
      await db.insert(admissionNotificationsTable).values({ applicationId: application.id, recipientEmail: application.email, template: "student_account_created", subject: "Your student account is ready", body: `Your student account has been created. Roll number: ${student.rollNumber}.` });
    }
  }
  res.json(assignment);
});

// ─── CSV export ───────────────────────────────────────────────────────────────
router.get("/admissions/applications/:applicationId/export.csv", staff, async (req, res): Promise<void> => {
  if (!canReview(req)) { res.status(403).json({ error: "Admission review permission required" }); return; }
  const [application] = await db.select().from(admissionApplicationsTable).where(eq(admissionApplicationsTable.applicationId, String(req.params.applicationId)));
  if (!application) { res.status(404).json({ error: "Application not found" }); return; }
  const docs = await db.select().from(admissionDocumentsTable).where(eq(admissionDocumentsTable.applicationId, application.id));
  const headers = ["Application ID", "Reference", "Applicant Name", "Email", "Phone", "Program", "Status", "Guardian", "Qualification", "Address", "Documents Uploaded", "Submitted At"];
  const row = [application.applicationId, application.referenceNumber, application.applicantName, application.email, application.phone, application.program, application.status, application.guardianName ?? "", application.qualification ?? "", application.address ?? "", String(docs.length), application.submittedAt?.toISOString() ?? ""];
  res.type("text/csv").attachment(`${application.applicationId}.csv`).send([headers.join(","), row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",")].join("\n"));
});

// ─── Excel export (HTML table format, Excel-compatible) ───────────────────────
router.get("/admissions/export.xlsx", staff, async (req, res): Promise<void> => {
  if (!canReview(req)) { res.status(403).json({ error: "Admission review permission required" }); return; }
  const rows = await db.select().from(admissionApplicationsTable).orderBy(desc(admissionApplicationsTable.createdAt));
  const esc = (v: string) => String(v ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/&/g, "&amp;");
  const head = ["Application ID", "Reference", "Applicant", "Email", "Phone", "Program", "Status", "Submitted At"].map((h) => `<th>${h}</th>`).join("");
  const body = rows.map((r) => `<tr>${[r.applicationId, r.referenceNumber, r.applicantName, r.email, r.phone, r.program, r.status, r.submittedAt?.toISOString() ?? ""].map((v) => `<td>${esc(v ?? "")}</td>`).join("")}</tr>`).join("");
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><table border="1"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`;
  res.type("application/vnd.ms-excel").attachment("admission-applications.xls").send(html);
});

// ─── Letter generation (printable HTML PDF-ready) ─────────────────────────────
router.get("/admissions/applications/:applicationId/letter", async (req, res): Promise<void> => {
  const [application] = await db.select().from(admissionApplicationsTable).where(eq(admissionApplicationsTable.applicationId, String(req.params.applicationId)));
  if (!application) { res.status(404).json({ error: "Application not found" }); return; }
  const letterRef = `LETTER-${application.referenceNumber}-${Date.now()}`;
  const date = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const statusMap: Record<string, { title: string; body: string }> = {
    approved: { title: "Admission Offer Letter", body: `Congratulations! We are pleased to offer you admission to the <strong>${application.program}</strong> programme. Please complete fee payment and document verification within 15 days. Your student portal credentials will be sent separately.` },
    rejected: { title: "Admission Decision Letter", body: `We regret to inform you that after careful review of your application, we are unable to offer admission to the <strong>${application.program}</strong> programme at this time. We encourage you to consider reapplying in the next cycle.` },
    waitlisted: { title: "Waitlist Letter", body: `Your application for <strong>${application.program}</strong> has been placed on the waitlist. You will be notified immediately if a seat becomes available. This letter serves as confirmation of your waitlist status.` },
    default: { title: "Admission Status Letter", body: `This letter confirms that your application for <strong>${application.program}</strong> is currently under review with status: <strong>${application.status}</strong>.` },
  };
  const letter = statusMap[application.status] ?? statusMap.default;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Georgia,serif;max-width:720px;margin:40px auto;padding:40px;color:#1a1a1a}h1{font-size:22px;border-bottom:2px solid #333;padding-bottom:8px}.detail{margin:4px 0}.footer{margin-top:60px;border-top:1px solid #ccc;padding-top:20px;font-size:12px;color:#555}@media print{body{margin:0}button{display:none}}</style></head><body><button onclick="window.print()" style="float:right;padding:8px 16px;background:#2563eb;color:#fff;border:0;border-radius:6px;cursor:pointer">Print / Save PDF</button><p style="color:#666;font-size:13px">${date}</p><h1>${letter.title}</h1><p>Dear <strong>${application.applicantName}</strong>,</p><p>${letter.body}</p><table style="margin:24px 0;border-collapse:collapse;width:100%">${[["Application ID", application.applicationId], ["Reference Number", application.referenceNumber], ["Programme", application.program], ["Status", application.status], ["Letter Reference", letterRef]].map(([k, v]) => `<tr><td style="padding:6px 12px;border:1px solid #ddd;background:#f9f9f9;font-weight:600;width:40%">${k}</td><td style="padding:6px 12px;border:1px solid #ddd">${v}</td></tr>`).join("")}</table><p>This is a computer-generated letter. For queries contact the Admissions Office.</p><div class="footer"><strong>Nexus College ERP</strong> · Admissions Office · admissions@nexuscollege.edu</div></body></html>`;
  res.type("text/html").send(html);
});

// ─── Reports ──────────────────────────────────────────────────────────────────
router.get("/admissions/reports", staff, async (req, res): Promise<void> => {
  if (!canReview(req)) { res.status(403).json({ error: "Admission review permission required" }); return; }
  const rows = await db.select().from(admissionApplicationsTable);
  const byProgram = Object.entries(rows.reduce<Record<string, number>>((acc, row) => { acc[row.program] = (acc[row.program] ?? 0) + 1; return acc; }, {})).map(([program, count]) => ({ program, count }));
  const total = rows.length; const approved = rows.filter((row) => row.status === "approved").length;
  res.json({ total, approved, rejected: rows.filter((row) => row.status === "rejected").length, pending: rows.filter((row) => !["approved", "rejected"].includes(row.status)).length, approvalRate: total ? Math.round(approved / total * 100) : 0, byProgram, funnel: statuses.map((status) => ({ status, count: rows.filter((row) => row.status === status).length })) });
});

// ─── Analytics ────────────────────────────────────────────────────────────────
router.get("/admissions/analytics", staff, async (req, res): Promise<void> => {
  if (!canReview(req)) { res.status(403).json({ error: "Admission review permission required" }); return; }
  const rows = await db.select().from(admissionApplicationsTable);
  const approved = rows.filter((r) => r.status === "approved").length;
  const byProgram = Object.entries(rows.reduce<Record<string, number>>((a, r) => { a[r.program] = (a[r.program] ?? 0) + 1; return a; }, {})).map(([program, count]) => ({ program, count })).sort((a, b) => b.count - a.count);
  // Review time: avg ms between createdAt and submittedAt for submitted/approved
  const reviewedRows = rows.filter((r) => r.submittedAt && r.createdAt);
  const avgReviewMs = reviewedRows.length ? reviewedRows.reduce((sum, r) => sum + (r.submittedAt!.getTime() - r.createdAt.getTime()), 0) / reviewedRows.length : 0;
  const avgReviewHours = Math.round(avgReviewMs / 3600000);
  // Trend: last 7 days
  const now = Date.now();
  const trend = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now - (6 - i) * 86400000);
    const label = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    const count = rows.filter((r) => {
      const rd = r.createdAt; return rd.getFullYear() === d.getFullYear() && rd.getMonth() === d.getMonth() && rd.getDate() === d.getDate();
    }).length;
    return { label, count };
  });
  // Officer performance: count reviews per officer
  const events = await db.select().from(admissionEventsTable).where(sql`event LIKE 'Application %' AND actor_id IS NOT NULL`);
  const officerCounts: Record<number, number> = {};
  for (const e of events) { if (e.actorId) officerCounts[e.actorId] = (officerCounts[e.actorId] ?? 0) + 1; }
  const officerIds = Object.keys(officerCounts).map(Number);
  const officers = officerIds.length ? await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable).where(sql`id = ANY(ARRAY[${sql.raw(officerIds.join(","))}])`) : [];
  const officerPerformance = officers.map((o) => ({ name: o.name, reviews: officerCounts[o.id] ?? 0 })).sort((a, b) => b.reviews - a.reviews);
  res.json({
    applications: rows.length, approvals: approved, rejections: rows.filter((r) => r.status === "rejected").length,
    pending: rows.filter((r) => !["approved", "rejected", "waitlisted"].includes(r.status)).length,
    waitlisted: rows.filter((r) => r.status === "waitlisted").length,
    conversionRate: rows.length ? Math.round(approved / rows.length * 100) : 0,
    avgReviewHours, byProgram, trend, officerPerformance,
    funnel: statuses.map((status) => ({ status, count: rows.filter((r) => r.status === status).length })),
  });
});

// ─── AI analysis ──────────────────────────────────────────────────────────────
router.get("/admissions/applications/:applicationId/ai-analysis", staff, async (req, res): Promise<void> => {
  if (!canReview(req)) { res.status(403).json({ error: "Admission review permission required" }); return; }
  const [application] = await db.select().from(admissionApplicationsTable).where(eq(admissionApplicationsTable.applicationId, String(req.params.applicationId)));
  if (!application) { res.status(404).json({ error: "Application not found" }); return; }
  const docs = await db.select().from(admissionDocumentsTable).where(eq(admissionDocumentsTable.applicationId, application.id));
  const required = ["passport_photo", "signature", "10th_certificate", "12th_certificate", "identity_proof"];
  const missing = required.filter((t) => !docs.some((d) => d.documentType === t));
  const docSummary = docs.length ? docs.map((d) => `${d.documentType} (${d.verificationStatus})`).join(", ") : "none";
  const prompt = `Admission application analysis request:\nApplicant: ${application.applicantName}\nProgram: ${application.program}\nStatus: ${application.status}\nDocuments: ${docSummary}\nMissing documents: ${missing.join(", ") || "none"}\nQualification: ${application.qualification ?? "not provided"}\n\nProvide: 1) Application summary 2) Eligibility analysis 3) Missing document analysis 4) Suggested decision 5) Officer notes`;
  const result = await generateAssistantResponse({ role: "admin", message: prompt });
  res.json({ applicationId: application.applicationId, analysis: result.content, missingDocuments: missing, documentsUploaded: docs.length, verifiedDocuments: docs.filter((d) => d.verificationStatus === "verified").length });
});

// ─── Interview management ─────────────────────────────────────────────────────
router.get("/admissions/applications/:id/interviews", staff, async (req, res): Promise<void> => {
  if (!canReview(req)) { res.status(403).json({ error: "Admission review permission required" }); return; }
  res.json(await db.select().from(admissionInterviewsTable).where(eq(admissionInterviewsTable.applicationId, Number(req.params.id))).orderBy(desc(admissionInterviewsTable.scheduledAt)));
});

router.post("/admissions/applications/:id/interview", staff, async (req, res): Promise<void> => {
  if (!canReview(req)) { res.status(403).json({ error: "Admission review permission required" }); return; }
  const [interview] = await db.insert(admissionInterviewsTable).values({ applicationId: Number(req.params.id), scheduledAt: new Date(req.body.scheduledAt), mode: req.body.mode ?? "online", status: "scheduled", notes: req.body.notes ?? null, assignedOfficerId: req.body.assignedOfficerId ?? null }).returning();
  const [application] = await db.select().from(admissionApplicationsTable).where(eq(admissionApplicationsTable.id, Number(req.params.id)));
  if (application) {
    await db.insert(admissionEventsTable).values({ applicationId: application.id, actorId: req.user!.userId, event: "Interview scheduled", comment: `Mode: ${interview.mode}` });
    await db.insert(admissionNotificationsTable).values({ applicationId: application.id, recipientEmail: application.email, template: "interview_scheduled", subject: "Interview scheduled", body: `Your interview has been scheduled for ${new Date(req.body.scheduledAt).toLocaleString("en-IN")}. Mode: ${interview.mode}.` });
    await db.insert(admissionDeliveryQueueTable).values({ applicationId: application.id, channel: "email", template: "interview_scheduled", recipient: application.email, payload: { scheduledAt: req.body.scheduledAt, mode: interview.mode } });
  }
  res.status(201).json(interview);
});

router.patch("/admissions/interviews/:id", staff, async (req, res): Promise<void> => {
  if (!canReview(req)) { res.status(403).json({ error: "Admission review permission required" }); return; }
  const updates: Record<string, any> = {};
  for (const k of ["status", "notes", "result", "feedback", "assignedOfficerId"] as const) { if (req.body[k] !== undefined) updates[k] = req.body[k]; }
  if (req.body.status === "completed") updates.completedAt = new Date();
  const [interview] = await db.update(admissionInterviewsTable).set(updates).where(eq(admissionInterviewsTable.id, Number(req.params.id))).returning();
  if (!interview) { res.status(404).json({ error: "Interview not found" }); return; }
  res.json(interview);
});

// ─── Entrance test management ─────────────────────────────────────────────────
router.get("/admissions/applications/:id/tests", staff, async (req, res): Promise<void> => {
  if (!canReview(req)) { res.status(403).json({ error: "Admission review permission required" }); return; }
  res.json(await db.select().from(admissionTestsTable).where(eq(admissionTestsTable.applicationId, Number(req.params.id))).orderBy(desc(admissionTestsTable.scheduledAt)));
});

router.post("/admissions/applications/:id/test", staff, async (req, res): Promise<void> => {
  if (!canReview(req)) { res.status(403).json({ error: "Admission review permission required" }); return; }
  const [test] = await db.insert(admissionTestsTable).values({ applicationId: Number(req.params.id), scheduledAt: new Date(req.body.scheduledAt), testCenter: req.body.testCenter ?? null, seatNumber: req.body.seatNumber ?? null }).returning();
  const [application] = await db.select().from(admissionApplicationsTable).where(eq(admissionApplicationsTable.id, Number(req.params.id)));
  if (application) {
    await db.insert(admissionEventsTable).values({ applicationId: application.id, actorId: req.user!.userId, event: "Entrance test scheduled", comment: `Center: ${test.testCenter ?? "TBD"}, Seat: ${test.seatNumber ?? "TBD"}` });
    await db.insert(admissionNotificationsTable).values({ applicationId: application.id, recipientEmail: application.email, template: "test_scheduled", subject: "Entrance test scheduled", body: `Your entrance test is scheduled for ${new Date(req.body.scheduledAt).toLocaleString("en-IN")}. Center: ${test.testCenter ?? "To be announced"}. Seat: ${test.seatNumber ?? "To be allocated"}.` });
    await db.insert(admissionDeliveryQueueTable).values({ applicationId: application.id, channel: "email", template: "test_scheduled", recipient: application.email, payload: { scheduledAt: req.body.scheduledAt, testCenter: test.testCenter ?? "", seatNumber: test.seatNumber ?? "" } });
  }
  res.status(201).json(test);
});

router.patch("/admissions/tests/:id", staff, async (req, res): Promise<void> => {
  if (!canReview(req)) { res.status(403).json({ error: "Admission review permission required" }); return; }
  const updates: Record<string, any> = {};
  for (const k of ["score", "result", "eligibilityDecision", "testCenter", "seatNumber"] as const) { if (req.body[k] !== undefined) updates[k] = k === "score" ? (req.body[k] == null ? null : Number(req.body[k])) : req.body[k]; }
  const [test] = await db.update(admissionTestsTable).set(updates).where(eq(admissionTestsTable.id, Number(req.params.id))).returning();
  if (!test) { res.status(404).json({ error: "Test not found" }); return; }
  res.json(test);
});

// ─── Academic assignments ──────────────────────────────────────────────────────
router.get("/admissions/academic-assignments", staff, async (req, res): Promise<void> => {
  if (!canReview(req)) { res.status(403).json({ error: "Admission review permission required" }); return; }
  const status = typeof req.query.status === "string" ? req.query.status : "pending";
  res.json(await db.select().from(admissionAcademicAssignmentsTable).where(eq(admissionAcademicAssignmentsTable.status, status)).orderBy(desc(admissionAcademicAssignmentsTable.createdAt)));
});

router.post("/admissions/applications/:id/academic-assignment", staff, async (req, res): Promise<void> => {
  if (!canReview(req)) { res.status(403).json({ error: "Admission review permission required" }); return; }
  const [assignment] = await db.insert(admissionAcademicAssignmentsTable).values({ applicationId: Number(req.params.id), departmentId: req.body.departmentId ?? null, courseId: req.body.courseId ?? null, semesterId: req.body.semesterId ?? null, academicSession: req.body.academicSession ?? null, notes: req.body.notes ?? null }).returning();
  res.status(201).json(assignment);
});

// ─── Delivery queue management ─────────────────────────────────────────────────
router.get("/admissions/delivery-queue", staff, async (req, res): Promise<void> => {
  if (!canReview(req)) { res.status(403).json({ error: "Admission review permission required" }); return; }
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const rows = await db.select().from(admissionDeliveryQueueTable).where(status ? eq(admissionDeliveryQueueTable.status, status) : undefined).orderBy(desc(admissionDeliveryQueueTable.createdAt)).limit(200);
  res.json(rows);
});

router.post("/admissions/delivery-queue", staff, async (req, res): Promise<void> => {
  if (!canReview(req)) { res.status(403).json({ error: "Admission review permission required" }); return; }
  const [item] = await db.insert(admissionDeliveryQueueTable).values({ applicationId: req.body.applicationId ?? null, channel: req.body.channel, template: req.body.template, recipient: req.body.recipient, payload: req.body.payload ?? {} }).returning();
  res.status(201).json(item);
});

export default router;
