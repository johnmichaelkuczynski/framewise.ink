import { randomBytes, randomUUID } from "node:crypto";
import { Router } from "express";
import { and, desc, eq, isNull } from "drizzle-orm";
import { apiKeysTable, db } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { hashApiKey } from "../middlewares/api-key-auth";

const router = Router();

router.get("/api-keys", requireAuth, async (req, res) => {
  const keys = await db
    .select({
      id: apiKeysTable.id,
      name: apiKeysTable.name,
      keyPrefix: apiKeysTable.keyPrefix,
      createdAt: apiKeysTable.createdAt,
      lastUsedAt: apiKeysTable.lastUsedAt,
    })
    .from(apiKeysTable)
    .where(and(eq(apiKeysTable.userId, req.user!.id), isNull(apiKeysTable.revokedAt)))
    .orderBy(desc(apiKeysTable.createdAt));

  res.json(keys);
});

router.post("/api-keys", requireAuth, async (req, res): Promise<void> => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  if (!name || name.length > 80) {
    res.status(400).json({ error: "Name is required and must be 80 characters or fewer" });
    return;
  }

  const secret = `fw_live_${randomBytes(32).toString("base64url")}`;
  const id = randomUUID();
  const keyPrefix = `${secret.slice(0, 16)}…`;

  await db.insert(apiKeysTable).values({
    id,
    userId: req.user!.id,
    name,
    keyPrefix,
    keyHash: hashApiKey(secret),
  });

  res.status(201).json({
    id,
    name,
    key: secret,
    keyPrefix,
    message: "Copy this key now. It will not be shown again.",
  });
});

router.delete("/api-keys/:id", requireAuth, async (req, res): Promise<void> => {
  const keyId = String(req.params.id);
  const updated = await db
    .update(apiKeysTable)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(apiKeysTable.id, keyId),
        eq(apiKeysTable.userId, req.user!.id),
        isNull(apiKeysTable.revokedAt),
      ),
    )
    .returning({ id: apiKeysTable.id });

  if (updated.length === 0) {
    res.status(404).json({ error: "API key not found" });
    return;
  }

  res.status(204).end();
});

export default router;