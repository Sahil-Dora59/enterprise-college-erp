import { Router, type IRouter } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  aiConversationsTable,
  aiMessagesTable,
  aiSettingsTable,
  aiPromptTemplatesTable,
  aiDocumentsTable,
  aiUsageLogsTable,
  db,
} from "@workspace/db";
import {
  CreateAiConversationBody,
  SendAiMessageBody,
  UpdateAiSettingsBody,
} from "@workspace/api-zod";
import { generateAssistantResponse } from "../services/aiService";

const router: IRouter = Router();

function parseId(value: string | string[]): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function getOwnedConversation(conversationId: number, userId: number) {
  const [conversation] = await db
    .select()
    .from(aiConversationsTable)
    .where(and(eq(aiConversationsTable.id, conversationId), eq(aiConversationsTable.userId, userId)));
  return conversation;
}

router.get("/ai/conversations", async (req, res): Promise<void> => {
  const conversations = await db
    .select()
    .from(aiConversationsTable)
    .where(eq(aiConversationsTable.userId, req.user!.userId))
    .orderBy(desc(aiConversationsTable.updatedAt))
    .limit(50);
  res.json(conversations);
});

router.post("/ai/conversations", async (req, res): Promise<void> => {
  const parsed = CreateAiConversationBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const title = parsed.data.title?.trim() || "New conversation";
  const [conversation] = await db
    .insert(aiConversationsTable)
    .values({
      userId: req.user!.userId,
      title,
      assistantRole: req.user!.role,
    })
    .returning();
  res.status(201).json(conversation);
});

router.get("/ai/conversations/:id/messages", async (req, res): Promise<void> => {
  const conversationId = parseId(req.params.id);
  if (!conversationId) {
    res.status(400).json({ error: "Invalid conversation id" });
    return;
  }
  const conversation = await getOwnedConversation(conversationId, req.user!.userId);
  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const messages = await db
    .select()
    .from(aiMessagesTable)
    .where(eq(aiMessagesTable.conversationId, conversationId))
    .orderBy(aiMessagesTable.createdAt);
  res.json(messages);
});

router.post("/ai/conversations/:id/messages", async (req, res): Promise<void> => {
  const conversationId = parseId(req.params.id);
  const parsed = SendAiMessageBody.safeParse(req.body);
  if (!conversationId || !parsed.success) {
    res.status(400).json({ error: parsed.success ? "Invalid conversation id" : parsed.error.message });
    return;
  }
  const content = parsed.data.content.trim();
  if (!content) {
    res.status(400).json({ error: "A message between 1 and 4000 characters is required" });
    return;
  }
  const conversation = await getOwnedConversation(conversationId, req.user!.userId);
  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const [userMessage] = await db
    .insert(aiMessagesTable)
    .values({ conversationId, role: "user", content })
    .returning();
  const response = await generateAssistantResponse({ role: req.user!.role, message: content });
  const [assistantMessage] = await db
    .insert(aiMessagesTable)
    .values({ conversationId, role: "assistant", content: response.content })
    .returning();
  await db
    .update(aiConversationsTable)
    .set({ title: conversation.title === "New conversation" ? content.slice(0, 60) : conversation.title })
    .where(eq(aiConversationsTable.id, conversationId));
  res.status(201).json({ userMessage, assistantMessage, provider: response.provider, model: response.model });
});

router.delete("/ai/conversations/:id", async (req, res): Promise<void> => {
  const conversationId = parseId(req.params.id);
  if (!conversationId) {
    res.status(400).json({ error: "Invalid conversation id" });
    return;
  }
  const conversation = await getOwnedConversation(conversationId, req.user!.userId);
  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  await db.delete(aiConversationsTable).where(eq(aiConversationsTable.id, conversationId));
  res.sendStatus(204);
});

router.patch("/ai/conversations/:id", async (req, res): Promise<void> => {
  const conversationId = parseId(req.params.id);
  if (!conversationId) { res.status(400).json({ error: "Invalid conversation id" }); return; }
  const conversation = await getOwnedConversation(conversationId, req.user!.userId);
  if (!conversation) { res.status(404).json({ error: "Conversation not found" }); return; }
  const title = typeof req.body?.title === "string" ? req.body.title.trim().slice(0, 120) : undefined;
  const isPinned = typeof req.body?.isPinned === "boolean" ? req.body.isPinned : undefined;
  if (!title && isPinned === undefined) { res.status(400).json({ error: "Title or pin state is required" }); return; }
  const [updated] = await db.update(aiConversationsTable).set({ ...(title ? { title } : {}), ...(isPinned === undefined ? {} : { isPinned }) }).where(eq(aiConversationsTable.id, conversationId)).returning();
  res.json(updated);
});

router.get("/ai/prompts", async (req, res): Promise<void> => {
  const prompts = await db.select().from(aiPromptTemplatesTable).where(eq(aiPromptTemplatesTable.userId, req.user!.userId)).orderBy(desc(aiPromptTemplatesTable.updatedAt)).limit(100);
  res.json(prompts);
});

router.post("/ai/prompts", async (req, res): Promise<void> => {
  const { title, prompt, category = "general" } = req.body ?? {};
  if (typeof title !== "string" || !title.trim() || typeof prompt !== "string" || !prompt.trim()) { res.status(400).json({ error: "Title and prompt are required" }); return; }
  const [created] = await db.insert(aiPromptTemplatesTable).values({ userId: req.user!.userId, title: title.trim().slice(0, 120), prompt: prompt.trim().slice(0, 4000), category: String(category).slice(0, 50) }).returning();
  res.status(201).json(created);
});

router.patch("/ai/prompts/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "Invalid prompt id" }); return; }
  const [updated] = await db.update(aiPromptTemplatesTable).set({ ...(typeof req.body?.title === "string" ? { title: req.body.title.trim() } : {}), ...(typeof req.body?.prompt === "string" ? { prompt: req.body.prompt.trim() } : {}), ...(typeof req.body?.isFavorite === "boolean" ? { isFavorite: req.body.isFavorite } : {}) }).where(and(eq(aiPromptTemplatesTable.id, id), eq(aiPromptTemplatesTable.userId, req.user!.userId))).returning();
  if (!updated) { res.status(404).json({ error: "Prompt not found" }); return; }
  res.json(updated);
});

router.get("/ai/documents", async (req, res): Promise<void> => {
  const documents = await db.select({ id: aiDocumentsTable.id, name: aiDocumentsTable.name, mimeType: aiDocumentsTable.mimeType, status: aiDocumentsTable.status, keywords: aiDocumentsTable.keywords, createdAt: aiDocumentsTable.createdAt }).from(aiDocumentsTable).where(eq(aiDocumentsTable.userId, req.user!.userId)).orderBy(desc(aiDocumentsTable.createdAt));
  res.json(documents);
});

router.post("/ai/documents", async (req, res): Promise<void> => {
  const { name, mimeType = "application/pdf", extractedText = "" } = req.body ?? {};
  if (typeof name !== "string" || !name.trim()) { res.status(400).json({ error: "Document name is required" }); return; }
  const keywords = String(extractedText).toLowerCase().match(/[a-z]{4,}/g)?.filter((word, index, list) => list.indexOf(word) === index).slice(0, 20) ?? [];
  const [created] = await db.insert(aiDocumentsTable).values({ userId: req.user!.userId, name: name.trim(), mimeType: String(mimeType), extractedText: String(extractedText).slice(0, 100000), keywords }).returning();
  res.status(201).json(created);
});

router.get("/ai/search", async (req, res): Promise<void> => {
  const query = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
  if (query.length < 2) { res.status(400).json({ error: "Search query must be at least 2 characters" }); return; }
  const [documents, prompts, conversations] = await Promise.all([
    db.select({ id: aiDocumentsTable.id, name: aiDocumentsTable.name, type: aiDocumentsTable.mimeType }).from(aiDocumentsTable).where(eq(aiDocumentsTable.userId, req.user!.userId)),
    db.select({ id: aiPromptTemplatesTable.id, title: aiPromptTemplatesTable.title, type: sql<string>`'prompt'` }).from(aiPromptTemplatesTable).where(eq(aiPromptTemplatesTable.userId, req.user!.userId)),
    db.select({ id: aiConversationsTable.id, title: aiConversationsTable.title, type: sql<string>`'conversation'` }).from(aiConversationsTable).where(eq(aiConversationsTable.userId, req.user!.userId)),
  ]);
  const results = [...documents, ...prompts, ...conversations].map((item) => ({
    id: item.id,
    type: item.type,
    label: "name" in item ? item.name : item.title,
  }));
  res.json(results.filter((item) => item.label.toLowerCase().includes(query)).slice(0, 50));
});

router.get("/ai/settings", async (_req, res): Promise<void> => {
  const [settings] = await db.select().from(aiSettingsTable).orderBy(desc(aiSettingsTable.updatedAt)).limit(1);
  res.json(settings ?? {
    id: 0,
    provider: "not_configured",
    model: "",
    systemPrompt: "",
    isEnabled: false,
    updatedBy: null,
    updatedAt: new Date(),
  });
});

router.put("/ai/settings", async (req, res): Promise<void> => {
  const parsed = UpdateAiSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const provider = parsed.data.provider.trim();
  const model = parsed.data.model.trim();
  const { systemPrompt, isEnabled } = parsed.data;
  if (!provider || !model) {
    res.status(400).json({ error: "Provider and model are required" });
    return;
  }
  const [existing] = await db.select({ id: aiSettingsTable.id }).from(aiSettingsTable).limit(1);
  const [settings] = existing
    ? await db.update(aiSettingsTable).set({ provider, model, systemPrompt, isEnabled, updatedBy: req.user!.userId }).where(eq(aiSettingsTable.id, existing.id)).returning()
    : await db.insert(aiSettingsTable).values({ provider, model, systemPrompt, isEnabled, updatedBy: req.user!.userId }).returning();
  res.json(settings);
});

export default router;