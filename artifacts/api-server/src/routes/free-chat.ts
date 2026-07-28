/**
 * Unauthenticated free-form chat endpoint.
 * Streams an AI response without requiring a session or saving anything to the DB.
 * Used when the user hasn't signed in yet.
 */
import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

const SYSTEM_PROMPT = `You are FrameWise, a precision communication coach. Your sole purpose: take whatever the user wants to say and rewrite it so it will land perfectly.

MANDATORY OUTPUT FORMAT — no exceptions:

1. Brief diagnosis
(2–5 short lines. Identify the core mismatch or communication risk in the original message.)

2. Optimized output
(The ready-to-send, ready-to-copy rewrite. Clean, formatted, no commentary.)

ABSOLUTE RULES:
- Never add explanations, coaching notes, or "why this works" sections.
- Never lecture the user.
- Never add a third section.
- The optimized output must be immediately usable — no placeholders, no brackets.
- Sign in to save your conversations and build psychological profiles for specific people.`;

router.post("/chat/free", async (req, res): Promise<void> => {
  const content = req.body?.content;
  if (!content || typeof content !== "string") {
    res.status(400).json({ error: "content is required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const stream = await openai.chat.completions.create({
    model: "gpt-4o",
    max_completion_tokens: 1024,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content },
    ],
    stream: true,
  });

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content;
    if (text) {
      res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
    }
  }

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

export default router;
