import { Router } from "express";
import { eq, and, asc } from "drizzle-orm";
import {
  db,
  conversationsTable,
  messagesTable,
  personsTable,
  virtualPersonsTable,
  profilesTable,
} from "@workspace/db";
import { SendMessageBody, ListMessagesParams } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.use(requireAuth);

// GET /conversations/:id/messages
router.get("/conversations/:id/messages", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = ListMessagesParams.safeParse({ id: parseInt(raw, 10) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const msgs = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, parsed.data.id))
    .orderBy(asc(messagesTable.createdAt));
  res.json(msgs.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })));
});

// POST /conversations/:id/messages — SSE streaming
router.post("/conversations/:id/messages", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const convId = parseInt(raw, 10);
  if (isNaN(convId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const bodyParsed = SendMessageBody.safeParse(req.body);
  if (!bodyParsed.success) { res.status(400).json({ error: bodyParsed.error.message }); return; }

  // Verify conversation belongs to user
  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(and(eq(conversationsTable.id, convId), eq(conversationsTable.userId, req.user!.id)));
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }

  // Persist user message
  await db.insert(messagesTable).values({
    conversationId: convId,
    role: "user",
    content: bodyParsed.data.content,
  });

  // Build system prompt
  const systemPrompt = await buildSystemPrompt(conv);

  // Fetch conversation history (last 20 messages)
  const history = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, convId))
    .orderBy(asc(messagesTable.createdAt))
    .limit(20);

  const chatMessages = [
    { role: "system" as const, content: systemPrompt },
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  // Stream SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";

  const stream = await openai.chat.completions.create({
    model: "gpt-5.6-terra",
    max_completion_tokens: 2048,
    messages: chatMessages,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      fullResponse += content;
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
  }

  // Persist assistant message
  await db.insert(messagesTable).values({
    conversationId: convId,
    role: "assistant",
    content: fullResponse,
  });

  // Update conversation updatedAt
  await db
    .update(conversationsTable)
    .set({ updatedAt: new Date() })
    .where(eq(conversationsTable.id, convId));

  // Auto-update title if first exchange
  if (history.length <= 1 && !conv.title) {
    const title = bodyParsed.data.content.slice(0, 60);
    await db.update(conversationsTable).set({ title }).where(eq(conversationsTable.id, convId));
  }

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

async function buildSystemPrompt(
  conv: typeof conversationsTable.$inferSelect,
): Promise<string> {
  const base = `You are FrameWise, a precision communication coach. Your sole purpose: take whatever the user wants to say and rewrite it so it will land perfectly with the specific recipient, given everything known about that person.

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
- Default to clarity and pure procedure when the target has limited bandwidth or emotional delicacy.`;

  if (conv.mode === "free") {
    return (
      base +
      `\n\nMode: Free-form. The user will provide the original message and briefly describe the recipient. Apply general best practices and sex-typical communication patterns based on any context given.`
    );
  }

  // Load person/virtual person profile for context
  let profileContext = "";

  if (conv.mode === "real" && conv.personId) {
    const [person] = await db
      .select()
      .from(personsTable)
      .where(eq(personsTable.id, conv.personId));
    const [profile] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.personId, conv.personId));

    if (person) {
      profileContext += `\nTarget: ${person.name}`;
      if (person.relationship) profileContext += ` (${person.relationship})`;
      if (person.gender) profileContext += `, gender: ${person.gender}`;
      if (person.notes) profileContext += `\nNotes: ${person.notes}`;
    }

    if (profile) {
      if (profile.cognitiveLevel)
        profileContext += `\nCognitive level: ${profile.cognitiveLevel}`;
      if (profile.emotionalProfile)
        profileContext += `\nEmotional profile: ${profile.emotionalProfile}`;
      if (profile.genderPatterns)
        profileContext += `\nGender patterns: ${profile.genderPatterns}`;
      if (profile.whatWorked?.length)
        profileContext += `\nWhat has worked: ${profile.whatWorked.join("; ")}`;
      if (profile.whatFailed?.length)
        profileContext += `\nWhat has failed: ${profile.whatFailed.join("; ")}`;
      if (profile.sayThis?.length)
        profileContext += `\nAlways say: ${profile.sayThis.join("; ")}`;
      if (profile.neverSayThis?.length)
        profileContext += `\nNever say: ${profile.neverSayThis.join("; ")}`;
      if (profile.affirmationLevers)
        profileContext += `\nAffirmation levers: ${profile.affirmationLevers}`;
      if (profile.pressureLevers)
        profileContext += `\nPressure levers: ${profile.pressureLevers}`;
    }

    return (
      base +
      `\n\nMode: Real Relationship. Apply all known profile constraints STRICTLY.\n${profileContext}`
    );
  }

  if (conv.mode === "virtual" && conv.virtualPersonId) {
    const [vp] = await db
      .select()
      .from(virtualPersonsTable)
      .where(eq(virtualPersonsTable.id, conv.virtualPersonId));
    const [profile] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.virtualPersonId, conv.virtualPersonId));

    if (vp) {
      profileContext += `\nVirtual target: ${vp.name}`;
      if (vp.gender) profileContext += `, gender: ${vp.gender}`;
      if (vp.cognitiveStyle) profileContext += `\nCognitive style: ${vp.cognitiveStyle}`;
      if (vp.emotionalStyle) profileContext += `\nEmotional style: ${vp.emotionalStyle}`;
      if (vp.sensitivities) profileContext += `\nSensitivities: ${vp.sensitivities}`;
      if (vp.backstory) profileContext += `\nBackstory: ${vp.backstory}`;
    }

    if (profile) {
      if (profile.whatWorked?.length)
        profileContext += `\nWhat has worked: ${profile.whatWorked.join("; ")}`;
      if (profile.whatFailed?.length)
        profileContext += `\nWhat has failed: ${profile.whatFailed.join("; ")}`;
      if (profile.sayThis?.length)
        profileContext += `\nAlways say: ${profile.sayThis.join("; ")}`;
      if (profile.neverSayThis?.length)
        profileContext += `\nNever say: ${profile.neverSayThis.join("; ")}`;
    }

    return (
      base +
      `\n\nMode: Virtual Relationship. You are simultaneously the communication coach AND you simulate realistic reactions from the virtual person after they receive the optimized message. After the "Optimized output" section, add a third section:\n\n3. Virtual reaction\n(How ${vp?.name ?? "the virtual person"} would realistically respond upon receiving the optimized message. Be honest — if the message is still flawed, say so.)\n${profileContext}`
    );
  }

  return base;
}

export default router;
