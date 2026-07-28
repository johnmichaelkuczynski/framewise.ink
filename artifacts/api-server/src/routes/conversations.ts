import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, conversationsTable, personsTable, virtualPersonsTable } from "@workspace/db";
import {
  CreateConversationBody,
  GetConversationParams,
  DeleteConversationParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.use(requireAuth);

function serializeConversation(c: typeof conversationsTable.$inferSelect, personName?: string | null) {
  return {
    ...c,
    personName: personName ?? null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

// GET /conversations
router.get("/conversations", async (req, res): Promise<void> => {
  const convs = await db
    .select({
      conversation: conversationsTable,
      personName: personsTable.name,
      virtualName: virtualPersonsTable.name,
    })
    .from(conversationsTable)
    .leftJoin(personsTable, eq(conversationsTable.personId, personsTable.id))
    .leftJoin(virtualPersonsTable, eq(conversationsTable.virtualPersonId, virtualPersonsTable.id))
    .where(eq(conversationsTable.userId, req.user!.id))
    .orderBy(conversationsTable.updatedAt);
  res.json(
    convs.map(({ conversation, personName, virtualName }) =>
      serializeConversation(conversation, personName ?? virtualName),
    ),
  );
});

// POST /conversations
router.post("/conversations", async (req, res): Promise<void> => {
  const parsed = CreateConversationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [conv] = await db
    .insert(conversationsTable)
    .values({ ...parsed.data, userId: req.user!.id })
    .returning();
  res.status(201).json(serializeConversation(conv));
});

// GET /conversations/:id
router.get("/conversations/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = GetConversationParams.safeParse({ id: parseInt(raw, 10) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const rows = await db
    .select({
      conversation: conversationsTable,
      personName: personsTable.name,
      virtualName: virtualPersonsTable.name,
    })
    .from(conversationsTable)
    .leftJoin(personsTable, eq(conversationsTable.personId, personsTable.id))
    .leftJoin(virtualPersonsTable, eq(conversationsTable.virtualPersonId, virtualPersonsTable.id))
    .where(and(eq(conversationsTable.id, parsed.data.id), eq(conversationsTable.userId, req.user!.id)));
  if (rows.length === 0) { res.status(404).json({ error: "Not found" }); return; }
  const { conversation, personName, virtualName } = rows[0];
  res.json(serializeConversation(conversation, personName ?? virtualName));
});

// DELETE /conversations/:id
router.delete("/conversations/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = DeleteConversationParams.safeParse({ id: parseInt(raw, 10) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  await db
    .delete(conversationsTable)
    .where(and(eq(conversationsTable.id, parsed.data.id), eq(conversationsTable.userId, req.user!.id)));
  res.json({ success: true });
});

export default router;
