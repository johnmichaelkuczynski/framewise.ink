import { Router, type NextFunction, type Request, type Response } from "express";
import { requireApiKey } from "../middlewares/api-key-auth";
import { coachMessage } from "../lib/framewise-coach";

const router = Router();
const MAX_CONTENT_LENGTH = 60_000;
const RATE_WINDOW_MS = 5 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 60;
const MAX_CONCURRENT_REQUESTS = 3;

type RateBucket = { count: number; active: number; resetAt: number };
const rateBuckets = new Map<string, RateBucket>();

function apiKeyRateLimit(req: Request, res: Response, next: NextFunction): void {
  const keyId = res.locals.apiKeyId as string | undefined;
  if (!keyId) {
    res.status(401).json({ error: "Invalid API key context" });
    return;
  }

  const now = Date.now();
  let bucket = rateBuckets.get(keyId);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, active: 0, resetAt: now + RATE_WINDOW_MS };
    rateBuckets.set(keyId, bucket);
  }

  const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  res.setHeader("X-RateLimit-Limit", String(MAX_REQUESTS_PER_WINDOW));
  res.setHeader("X-RateLimit-Remaining", String(Math.max(0, MAX_REQUESTS_PER_WINDOW - bucket.count)));
  res.setHeader("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

  if (bucket.count >= MAX_REQUESTS_PER_WINDOW) {
    res.setHeader("Retry-After", String(retryAfter));
    res.status(429).json({ error: "API rate limit reached. Please retry later." });
    return;
  }
  if (bucket.active >= MAX_CONCURRENT_REQUESTS) {
    res.setHeader("Retry-After", "2");
    res.status(429).json({ error: "Too many concurrent requests. Please retry shortly." });
    return;
  }

  bucket.count += 1;
  bucket.active += 1;
  res.setHeader("X-RateLimit-Remaining", String(Math.max(0, MAX_REQUESTS_PER_WINDOW - bucket.count)));
  let released = false;
  const release = () => {
    if (!released) {
      released = true;
      bucket!.active = Math.max(0, bucket!.active - 1);
    }
  };
  res.once("finish", release);
  res.once("close", release);
  next();
}

setInterval(() => {
  const now = Date.now();
  for (const [keyId, bucket] of rateBuckets) {
    if (bucket.active === 0 && now >= bucket.resetAt) rateBuckets.delete(keyId);
  }
}, RATE_WINDOW_MS).unref();

router.post("/v1/coach", requireApiKey, apiKeyRateLimit, async (req, res): Promise<void> => {
  const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";
  if (!content) {
    res.status(400).json({ error: "content is required" });
    return;
  }
  if (content.length > MAX_CONTENT_LENGTH) {
    res.status(413).json({ error: `content must be ${MAX_CONTENT_LENGTH} characters or fewer` });
    return;
  }

  try {
    const output = await coachMessage(content);
    if (!output) {
      res.status(502).json({ error: "FrameWise did not return a response" });
      return;
    }
    res.json({ output });
  } catch (err) {
    req.log.error({ err, userId: req.user!.id }, "External coaching request failed");
    res.status(502).json({ error: "FrameWise could not process the request" });
  }
});

export default router;