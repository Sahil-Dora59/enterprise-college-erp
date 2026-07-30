import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  aiConversationsTable,
  aiMessagesTable,
  aiSettingsTable,
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