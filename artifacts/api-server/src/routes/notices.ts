import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, noticesTable, usersTable } from "@workspace/db";
import { ListNoticesQueryParams, CreateNoticeBody, GetNoticeParams, UpdateNoticeParams, UpdateNoticeBody, DeleteNoticeParams } from "@workspace/api-zod";
import { authenticate } from "../middlewares/auth";

const router: IRouter = Router();

type NoticeView = Omit<typeof noticesTable.$inferSelect, "updatedAt"> & { authorName?: string | null };

function fmtNotice(r: NoticeView) {
  return {
    ...r,
    publishedAt: r.publishedAt.toISOString(),
    expiresAt: r.expiresAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

router.get("/notices", authenticate, async (req, res): Promise<void> => {
  const parsed = ListNoticesQueryParams.safeParse(req.query);
  const { targetRole, priority } = parsed.data ?? {};

  const conditions: ReturnType<typeof eq>[] = [];
  if (targetRole) conditions.push(eq(noticesTable.targetRole, targetRole as string));
  if (priority) conditions.push(eq(noticesTable.priority, priority as string));

  const rows = await db
    .select({
      id: noticesTable.id,
      title: noticesTable.title,
      content: noticesTable.content,
      priority: noticesTable.priority,
      targetRole: noticesTable.targetRole,
      authorId: noticesTable.authorId,
      attachmentUrl: noticesTable.attachmentUrl,
      publishedAt: noticesTable.publishedAt,
      expiresAt: noticesTable.expiresAt,
      isActive: noticesTable.isActive,
      createdAt: noticesTable.createdAt,
      authorName: usersTable.name,
    })
    .from(noticesTable)
    .leftJoin(usersTable, eq(noticesTable.authorId, usersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  res.json(rows.map(fmtNotice));
});

router.post("/notices", authenticate, async (req, res): Promise<void> => {
  const parsed = CreateNoticeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const data: typeof noticesTable.$inferInsert = {
    ...parsed.data,
    publishedAt: new Date(parsed.data.publishedAt),
    expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
  };
  const [notice] = await db.insert(noticesTable).values(data).returning();
  res.status(201).json(fmtNotice({ ...notice, authorName: null }));
});

router.get("/notices/:id", authenticate, async (req, res): Promise<void> => {
  const params = GetNoticeParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db
    .select({ id: noticesTable.id, title: noticesTable.title, content: noticesTable.content, priority: noticesTable.priority, targetRole: noticesTable.targetRole, authorId: noticesTable.authorId, attachmentUrl: noticesTable.attachmentUrl, publishedAt: noticesTable.publishedAt, expiresAt: noticesTable.expiresAt, isActive: noticesTable.isActive, createdAt: noticesTable.createdAt, authorName: usersTable.name })
    .from(noticesTable).leftJoin(usersTable, eq(noticesTable.authorId, usersTable.id))
    .where(eq(noticesTable.id, params.data.id));
  if (!row) { res.status(404).json({ error: "Notice not found" }); return; }
  res.json(fmtNotice(row));
});

router.patch("/notices/:id", authenticate, async (req, res): Promise<void> => {
  const params = UpdateNoticeParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateNoticeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const data = {
    ...parsed.data,
    ...(parsed.data.publishedAt && { publishedAt: new Date(parsed.data.publishedAt) }),
    ...(parsed.data.expiresAt && { expiresAt: new Date(parsed.data.expiresAt) }),
  } as typeof noticesTable.$inferInsert;
  const [notice] = await db.update(noticesTable).set(data).where(eq(noticesTable.id, params.data.id)).returning();
  if (!notice) { res.status(404).json({ error: "Notice not found" }); return; }
  res.json(fmtNotice({ ...notice, authorName: null }));
});

router.delete("/notices/:id", authenticate, async (req, res): Promise<void> => {
  const params = DeleteNoticeParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [n] = await db.delete(noticesTable).where(eq(noticesTable.id, params.data.id)).returning();
  if (!n) { res.status(404).json({ error: "Notice not found" }); return; }
  res.sendStatus(204);
});

export default router;
