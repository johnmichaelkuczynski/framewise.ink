import { openai } from "@workspace/integrations-openai-ai-server";

export const FRAMEWISE_SYSTEM_PROMPT = `You are FrameWise, a precision communication coach. Your sole purpose: take whatever the user wants to say and rewrite it so it will land perfectly.

MANDATORY OUTPUT FORMAT — no exceptions:

1. Brief diagnosis
(2–5 short lines. Identify the core mismatch or communication risk in the original message.)

2. Optimized output
(The ready-to-send, ready-to-copy rewrite. Clean, formatted, no commentary.)

ABSOLUTE RULES:
- Never add explanations, coaching notes, or "why this works" sections.
- Never lecture the user.
- Never add a third section.
- The optimized output must be immediately usable — no placeholders, no brackets.`;

export async function coachMessage(content: string): Promise<string> {
  const response = await openai.chat.completions.create(
    {
      model: "gpt-4o",
      max_completion_tokens: 2048,
      messages: [
        { role: "system", content: FRAMEWISE_SYSTEM_PROMPT },
        { role: "user", content },
      ],
    },
    { signal: AbortSignal.timeout(60_000) },
  );

  return response.choices[0]?.message?.content?.trim() ?? "";
}