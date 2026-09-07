import { createHash, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

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
  const configuredKey = process.env.FRAMEWISE_API_KEY;
  if (!configuredKey) {
    res.status(503).json({ error: "FrameWise API access is not configured" });
    return;
  }

  const supplied = Buffer.from(rawKey, "utf8");
  const expected = Buffer.from(configuredKey, "utf8");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    res.status(401).json({ error: "Invalid API key" });
    return;
  }

  res.locals.apiKeyId = hashApiKey(configuredKey);

  next();
}