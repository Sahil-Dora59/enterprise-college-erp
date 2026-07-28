import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, semestersTable } from "@workspace/db";
import { CreateSemesterBody, GetSemesterParams, UpdateSemesterParams, UpdateSemesterBody, DeleteSemesterParams } from "@workspace/api-zod";
import { authenticate } from "../middlewares/auth";

const router: IRouter = Router();

function fmt(s: typeof semestersTable.$inferSelect) {
  return { ...s, createdAt: s.createdAt.toISOString() };
}

router.get("/semesters", authenticate, async (_req, res): Promise<void> => {
  const semesters = await db.select().from(semestersTable);
  res.json(semesters.map(fmt));
});

router.post("/semesters", authenticate, async (req, res): Promise<void> => {
  const parsed = CreateSemesterBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [sem] = await db.insert(semestersTable).values(parsed.data).returning();
  res.status(201).json(fmt(sem));
});

router.get("/semesters/:id", authenticate, async (req, res): Promise<void> => {
  const params = GetSemesterParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [sem] = await db.select().from(semestersTable).where(eq(semestersTable.id, params.data.id));
  if (!sem) { res.status(404).json({ error: "Semester not found" }); return; }
  res.json(fmt(sem));
});

router.patch("/semesters/:id", authenticate, async (req, res): Promise<void> => {
  const params = UpdateSemesterParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateSemesterBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [sem] = await db.update(semestersTable).set(parsed.data).where(eq(semestersTable.id, params.data.id)).returning();
  if (!sem) { res.status(404).json({ error: "Semester not found" }); return; }
  res.json(fmt(sem));
});

router.delete("/semesters/:id", authenticate, async (req, res): Promise<void> => {
  const params = DeleteSemesterParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [sem] = await db.delete(semestersTable).where(eq(semestersTable.id, params.data.id)).returning();
  if (!sem) { res.status(404).json({ error: "Semester not found" }); return; }
  res.sendStatus(204);
});

export default router;
