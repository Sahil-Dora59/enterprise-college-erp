import { Router, type IRouter } from "express";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { admissionApplicationsTable, admissionEventsTable, db } from "@workspace/db";
import { authenticate } from "../middlewares/auth";
import crypto from "node:crypto";

const router: IRouter = Router();
const statuses = ["draft", "submitted", "verification", "review", "approved", "rejected", "waitlisted", "correction_requested"] as const;
const staff = authenticate;
const canReview = (req: any) => ["super_admin", "admin", "secretary", "admission_officer"].includes(req.user?.role);

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
  const applicationId = `APP-${new Date().getFullYear()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  const referenceNumber = `REF-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
  const [application] = await db.insert(admissionApplicationsTable).values({
    applicationId, referenceNumber, applicantName: body.applicantName.trim(), email: body.email.trim().toLowerCase(),
    phone: body.phone ?? "", guardianName: body.guardianName ?? null, guardianPhone: body.guardianPhone ?? null,
    address: body.address ?? null, qualification: body.qualification ?? null, program: body.program,
    documents: body.documents ?? {}, declarationAccepted: Boolean(body.declarationAccepted),
    status: body.submit ? "submitted" : "draft", submittedAt: body.submit ? new Date() : null,
  }).returning();
  await db.insert(admissionEventsTable).values({ applicationId: application.id, event: body.submit ? "Application submitted" : "Draft saved" });
  res.status(201).json(view(application));
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
  res.json(view(application));
});

export default router;