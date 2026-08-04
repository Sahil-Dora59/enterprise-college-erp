import { Router, type IRouter } from "express";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db, placementCompaniesTable, placementJobsTable, placementApplicationsTable, placementResumesTable, placementInterviewsTable, placementOffersTable, placementDrivesTable, alumniProfilesTable } from "@workspace/db";
import { authenticate } from "../middlewares/auth";
import { generateAssistantResponse } from "../services/aiService";
const router: IRouter = Router();
const placementRoles = ["super_admin", "admin", "secretary", "placement_officer", "recruiter", "student", "alumni"];
const staff = (req: any) => ["super_admin", "admin", "secretary", "placement_officer", "recruiter"].includes(req.user?.role);
const recruiter = (req: any) => ["super_admin", "admin", "placement_officer", "recruiter"].includes(req.user?.role);
const office = (req: any) => ["super_admin", "admin", "placement_officer"].includes(req.user?.role);
router.use(authenticate);

router.get("/placements/dashboard", async (req, res) => {
  const applications = await db.select().from(placementApplicationsTable).where(eq(placementApplicationsTable.studentId, req.user!.userId));
  const resumes = await db.select().from(placementResumesTable).where(eq(placementResumesTable.studentId, req.user!.userId)).orderBy(desc(placementResumesTable.version));
  const interviews = await db.select().from(placementInterviewsTable).where(sql`${placementInterviewsTable.applicationId} in (select id from placement_applications where student_id = ${req.user!.userId})`);
  const offers = await db.select().from(placementOffersTable).where(sql`${placementOffersTable.applicationId} in (select id from placement_applications where student_id = ${req.user!.userId})`);
  res.json({ placementStatus: offers.length ? "Selected" : applications.length ? "In process" : "Not placed", eligibilityStatus: "Eligible", applications, interviews, offers, resumeCompletion: resumes[0]?.score ?? 0, skillsScore: resumes[0]?.score ?? 0, timeline: [] });
});
router.get("/placements/jobs", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const jobs = await db.select({ job: placementJobsTable, company: placementCompaniesTable }).from(placementJobsTable).leftJoin(placementCompaniesTable, eq(placementJobsTable.companyId, placementCompaniesTable.id)).where(and(eq(placementJobsTable.status, "open"), q ? or(ilike(placementJobsTable.title, `%${q}%`), ilike(placementCompaniesTable.name, `%${q}%`)) : undefined)).orderBy(desc(placementJobsTable.createdAt));
  res.json(jobs);
});
router.post("/placements/applications", async (req, res) => {
  const [job] = await db.select().from(placementJobsTable).where(eq(placementJobsTable.id, Number(req.body.jobId)));
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  const [existing] = await db.select().from(placementApplicationsTable).where(and(eq(placementApplicationsTable.jobId, job.id), eq(placementApplicationsTable.studentId, req.user!.userId)));
  if (existing) { res.status(409).json({ error: "Already applied" }); return; }
  res.status(201).json((await db.insert(placementApplicationsTable).values({ jobId: job.id, studentId: req.user!.userId }).returning())[0]);
});
router.patch("/placements/applications/:id", async (req, res) => { const [row] = await db.update(placementApplicationsTable).set({ status: req.body.status ?? "withdrawn" }).where(and(eq(placementApplicationsTable.id, Number(req.params.id)), eq(placementApplicationsTable.studentId, req.user!.userId))).returning(); res.json(row); });
router.get("/placements/resume", async (req, res) => res.json(await db.select().from(placementResumesTable).where(eq(placementResumesTable.studentId, req.user!.userId)).orderBy(desc(placementResumesTable.version))));
router.post("/placements/resume", async (req, res) => { const previous = await db.select().from(placementResumesTable).where(eq(placementResumesTable.studentId, req.user!.userId)).orderBy(desc(placementResumesTable.version)); const data = req.body?.data ?? req.body ?? {}; const score = Math.min(100, Object.keys(data).filter((key) => data[key]).length * 8); const [row] = await db.insert(placementResumesTable).values({ studentId: req.user!.userId, version: (previous[0]?.version ?? 0) + 1, data, score }).returning(); res.status(201).json(row); });
router.get("/placements/companies", async (req, res) => { if (!office(req) && !recruiter(req)) { res.status(403).json({ error: "Placement office access required" }); return; } res.json(await db.select().from(placementCompaniesTable).orderBy(desc(placementCompaniesTable.createdAt))); });
router.post("/placements/companies", async (req, res) => { if (!office(req)) { res.status(403).json({ error: "Placement office access required" }); return; } const [row] = await db.insert(placementCompaniesTable).values({ name: req.body.name, email: req.body.email, website: req.body.website, industry: req.body.industry, status: "pending" }).returning(); res.status(201).json(row); });
router.post("/placements/jobs", async (req, res) => { if (!recruiter(req)) { res.status(403).json({ error: "Recruiter access required" }); return; } const [row] = await db.insert(placementJobsTable).values({ companyId: Number(req.body.companyId), title: req.body.title, type: req.body.type ?? "placement", description: req.body.description ?? null, location: req.body.location ?? null, packageAmount: req.body.packageAmount ?? null, eligibility: req.body.eligibility ?? {}, deadline: req.body.deadline ? new Date(req.body.deadline) : null }).returning(); res.status(201).json(row); });
router.patch("/placements/jobs/:id", async (req, res) => { if (!recruiter(req)) { res.status(403).json({ error: "Recruiter access required" }); return; } const updates: Record<string, unknown> = {}; for (const key of ["title", "type", "description", "location", "packageAmount", "status", "eligibility"]) if (req.body[key] !== undefined) updates[key] = req.body[key]; if (req.body.deadline !== undefined) updates.deadline = req.body.deadline ? new Date(req.body.deadline) : null; const [row] = await db.update(placementJobsTable).set(updates).where(eq(placementJobsTable.id, Number(req.params.id))).returning(); res.json(row); });
router.delete("/placements/jobs/:id", async (req, res) => { if (!recruiter(req)) { res.status(403).json({ error: "Recruiter access required" }); return; } await db.delete(placementJobsTable).where(eq(placementJobsTable.id, Number(req.params.id))); res.status(204).send(); });
router.get("/placements/reports", async (req, res) => { if (!office(req)) { res.status(403).json({ error: "Placement office access required" }); return; } const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(placementApplicationsTable); const [{ jobs }] = await db.select({ jobs: sql<number>`count(*)` }).from(placementJobsTable); res.json({ placementPercentage: 0, applications: Number(count), jobs: Number(jobs), highestPackage: null, averagePackage: null, companies: await db.select().from(placementCompaniesTable) }); });
router.get("/placements/export.csv", async (req, res) => { if (!office(req)) { res.status(403).json({ error: "Placement office access required" }); return; } const rows = await db.select().from(placementApplicationsTable); res.type("text/csv").send(["id,jobId,studentId,status", ...rows.map((r) => `${r.id},${r.jobId},${r.studentId},${r.status}`)].join("\n")); });
router.post("/placements/ai", async (req, res) => { const result = await generateAssistantResponse({ role: req.user!.role, message: `Placement career request: ${String(req.body.prompt ?? "Provide career guidance")}` }); res.json(result); });
router.get("/placements/alumni", async (req, res) => res.json(await db.select().from(alumniProfilesTable)));
router.post("/placements/interviews", async (req, res) => { if (!office(req)) { res.status(403).json({ error: "Placement office access required" }); return; } const [row] = await db.insert(placementInterviewsTable).values({ applicationId: Number(req.body.applicationId), scheduledAt: new Date(req.body.scheduledAt), round: req.body.round ?? "Round 1" }).returning(); res.status(201).json(row); });
router.post("/placements/offers", async (req, res) => { if (!office(req)) { res.status(403).json({ error: "Placement office access required" }); return; } const [row] = await db.insert(placementOffersTable).values({ applicationId: Number(req.body.applicationId), packageAmount: req.body.packageAmount, documentHtml: req.body.documentHtml }).returning(); res.status(201).json(row); });
export default router;