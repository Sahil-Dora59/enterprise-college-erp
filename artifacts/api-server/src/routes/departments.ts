import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, departmentsTable, studentsTable, facultyTable } from "@workspace/db";
import { CreateDepartmentBody, GetDepartmentParams, UpdateDepartmentParams, UpdateDepartmentBody, DeleteDepartmentParams } from "@workspace/api-zod";
import { authenticate } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/departments", authenticate, async (_req, res): Promise<void> => {
  const departments = await db.select().from(departmentsTable);
  const deptIds = departments.map((d) => d.id);

  if (deptIds.length === 0) {
    res.json([]);
    return;
  }

  const [studentCounts, facultyCounts] = await Promise.all([
    db.select({ departmentId: studentsTable.departmentId, count: sql<number>`count(*)::int` })
      .from(studentsTable).groupBy(studentsTable.departmentId),
    db.select({ departmentId: facultyTable.departmentId, count: sql<number>`count(*)::int` })
      .from(facultyTable).groupBy(facultyTable.departmentId),
  ]);

  const scMap = new Map(studentCounts.map((r) => [r.departmentId, r.count]));
  const fcMap = new Map(facultyCounts.map((r) => [r.departmentId, r.count]));

  const result = departments.map((d) => ({
    ...d,
    studentCount: scMap.get(d.id) ?? 0,
    facultyCount: fcMap.get(d.id) ?? 0,
    createdAt: d.createdAt.toISOString(),
  }));
  res.json(result);
});

router.post("/departments", authenticate, async (req, res): Promise<void> => {
  const parsed = CreateDepartmentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [dept] = await db.insert(departmentsTable).values(parsed.data).returning();
  res.status(201).json({ ...dept, studentCount: 0, facultyCount: 0, createdAt: dept.createdAt.toISOString() });
});

router.get("/departments/:id", authenticate, async (req, res): Promise<void> => {
  const params = GetDepartmentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [dept] = await db.select().from(departmentsTable).where(eq(departmentsTable.id, params.data.id));
  if (!dept) { res.status(404).json({ error: "Department not found" }); return; }
  const [[sc], [fc]] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(studentsTable).where(eq(studentsTable.departmentId, dept.id)),
    db.select({ count: sql<number>`count(*)::int` }).from(facultyTable).where(eq(facultyTable.departmentId, dept.id)),
  ]);
  res.json({ ...dept, studentCount: sc?.count ?? 0, facultyCount: fc?.count ?? 0, createdAt: dept.createdAt.toISOString() });
});

router.patch("/departments/:id", authenticate, async (req, res): Promise<void> => {
  const params = UpdateDepartmentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateDepartmentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [dept] = await db.update(departmentsTable).set(parsed.data).where(eq(departmentsTable.id, params.data.id)).returning();
  if (!dept) { res.status(404).json({ error: "Department not found" }); return; }
  res.json({ ...dept, studentCount: null, facultyCount: null, createdAt: dept.createdAt.toISOString() });
});

router.delete("/departments/:id", authenticate, async (req, res): Promise<void> => {
  const params = DeleteDepartmentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [dept] = await db.delete(departmentsTable).where(eq(departmentsTable.id, params.data.id)).returning();
  if (!dept) { res.status(404).json({ error: "Department not found" }); return; }
  res.sendStatus(204);
});

export default router;
