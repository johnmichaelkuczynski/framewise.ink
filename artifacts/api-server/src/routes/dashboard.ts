import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, personsTable, virtualPersonsTable, conversationsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { sql } from "drizzle-orm";

const router = Router();

router.use(requireAuth);

router.get("/dashboard", async (req, res): Promise<void> => {
  const userId = req.user!.id;

  const [personCount, virtualPersonCount, conversationCount, recentRaw] =
    await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(personsTable)
        .where(eq(personsTable.userId, userId))
        .then((r) => r[0]?.count ?? 0),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(virtualPersonsTable)
        .where(eq(virtualPersonsTable.userId, userId))
        .then((r) => r[0]?.count ?? 0),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(conversationsTable)
        .where(eq(conversationsTable.userId, userId))
        .then((r) => r[0]?.count ?? 0),
      db
        .select()
        .from(conversationsTable)
        .where(eq(conversationsTable.userId, userId))
        .orderBy(conversationsTable.updatedAt)
        .limit(5),
    ]);

  const recentConversations = recentRaw.map((c) => ({
    ...c,
    personName: null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));

  res.json({
    totalPersons: personCount,
    totalVirtualPersons: virtualPersonCount,
    totalConversations: conversationCount,
    recentConversations,
  });
});

export default router;
