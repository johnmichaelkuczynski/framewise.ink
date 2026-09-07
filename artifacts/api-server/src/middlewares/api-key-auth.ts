import { createHash } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { and, eq, isNull } from "drizzle-orm";
import { apiKeysTable, db, usersTable } from "@workspace/db";

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("hex");
}

export async function requireApiKey(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authorization = req.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing API key. Use Authorization: Bearer fw_live_..." });
    return;
  }

  const rawKey = authorization.slice(7).trim();
  if (!rawKey.startsWith("fw_live_") || rawKey.length < 40) {
    res.status(401).json({ error: "Invalid API key" });
    return;
  }

  const rows = await db
    .select({ keyId: apiKeysTable.id, user: usersTable })
    .from(apiKeysTable)
    .innerJoin(usersTable, eq(usersTable.id, apiKeysTable.userId))
    .where(
      and(
        eq(apiKeysTable.keyHash, hashApiKey(rawKey)),
        isNull(apiKeysTable.revokedAt),
      ),
    )
    .limit(1);

  if (rows.length === 0) {
    res.status(401).json({ error: "Invalid or revoked API key" });
    return;
  }

  const { keyId, user } = rows[0];
  res.locals.apiKeyId = keyId;
  req.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    picture: user.picture ?? null,
  };

  void db
    .update(apiKeysTable)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeysTable.id, keyId))
    .catch((err) => req.log.warn({ err, keyId }, "Could not update API key usage"));

  next();
}