/**
 * Photo upload + Vision analysis for persons and virtual persons.
 *
 * POST /persons/:id/photo       — upload a photo, analyze it, update photoUrl + profile
 * POST /virtual-persons/:id/photo — same for virtual persons
 *
 * The photo is stored as a compact base64 data URL in the photoUrl column.
 * OpenAI Vision analyzes the photo for communication-relevant cues (confidence,
 * emotional tone, approachability, formality signals) and merges findings into the
 * person's profile fields.
 */
import { Router } from "express";
import multer from "multer";
import { eq, and } from "drizzle-orm";
import { db, personsTable, virtualPersonsTable, profilesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();
router.use(requireAuth);

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter(_req, file, cb) {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are accepted for photos."));
    }
  },
});

const VISION_PROMPT = `You are analyzing a photo of a person to help a communication coach understand how to interact with them more effectively.

Analyze the photo and return a JSON object with these fields (all strings, be concise):
{
  "appearance": "brief physical description — age range, general presentation, style",
  "emotionalTone": "apparent emotional baseline from the photo — calm, intense, warm, guarded, etc.",
  "confidenceLevel": "apparent confidence — assertive, reserved, approachable, authoritative, etc.",
  "formalitySignals": "clothing and presentation signals — formal, casual, creative, conservative, etc.",
  "communicationCues": "2-3 specific communication insights suggested by the photo",
  "genderPatterns": "apparent gender presentation and any relevant communication patterns this might suggest"
}

Return ONLY valid JSON. No other text.`;

async function analyzePhotoWithVision(
  buffer: Buffer,
  mimeType: string,
): Promise<Record<string, string> | null> {
  try {
    const base64 = buffer.toString("base64");
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: VISION_PROMPT },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64}`, detail: "low" },
            },
          ],
        },
      ],
    });
    const text = response.choices[0]?.message?.content ?? "";
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function buildDataUrl(buffer: Buffer, mimeType: string): string {
  // Limit stored photo to 400KB to keep DB reasonable
  const MAX = 400 * 1024;
  const buf = buffer.length > MAX ? buffer.subarray(0, MAX) : buffer;
  return `data:${mimeType};base64,${buf.toString("base64")}`;
}

// POST /persons/:id/photo
router.post("/persons/:id/photo", photoUpload.single("photo"), async (req, res): Promise<void> => {
  if (!req.file) { res.status(400).json({ error: "No photo uploaded" }); return; }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const personId = parseInt(raw, 10);
  if (isNaN(personId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [person] = await db
    .select()
    .from(personsTable)
    .where(and(eq(personsTable.id, personId), eq(personsTable.userId, req.user!.id)));
  if (!person) { res.status(404).json({ error: "Person not found" }); return; }

  const photoUrl = buildDataUrl(req.file.buffer, req.file.mimetype);

  // Run Vision analysis in parallel with saving the photo
  const [analysis] = await Promise.all([
    analyzePhotoWithVision(req.file.buffer, req.file.mimetype),
    db.update(personsTable).set({ photoUrl, updatedAt: new Date() }).where(eq(personsTable.id, personId)),
  ]);

  // Merge Vision findings into the person's profile
  if (analysis) {
    const [existing] = await db.select().from(profilesTable).where(eq(profilesTable.personId, personId));
    const mergedProfile = {
      genderPatterns: analysis.genderPatterns ?? existing?.genderPatterns ?? null,
      emotionalProfile: analysis.emotionalTone
        ? `${analysis.emotionalTone}. ${analysis.confidenceLevel ?? ""}`.trim()
        : existing?.emotionalProfile ?? null,
      cognitiveLevel: existing?.cognitiveLevel ?? null,
    };
    if (existing) {
      await db.update(profilesTable).set({ ...mergedProfile, updatedAt: new Date() }).where(eq(profilesTable.personId, personId));
    } else {
      await db.insert(profilesTable).values({ personId, ...mergedProfile });
    }
  }

  const [updated] = await db.select().from(personsTable).where(eq(personsTable.id, personId));
  res.json({
    photoUrl,
    analysis,
    person: { ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() },
  });
});

// POST /virtual-persons/:id/photo
router.post("/virtual-persons/:id/photo", photoUpload.single("photo"), async (req, res): Promise<void> => {
  if (!req.file) { res.status(400).json({ error: "No photo uploaded" }); return; }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const vpId = parseInt(raw, 10);
  if (isNaN(vpId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [vp] = await db
    .select()
    .from(virtualPersonsTable)
    .where(and(eq(virtualPersonsTable.id, vpId), eq(virtualPersonsTable.userId, req.user!.id)));
  if (!vp) { res.status(404).json({ error: "Virtual person not found" }); return; }

  const photoUrl = buildDataUrl(req.file.buffer, req.file.mimetype);

  const [analysis] = await Promise.all([
    analyzePhotoWithVision(req.file.buffer, req.file.mimetype),
    db.update(virtualPersonsTable).set({ photoUrl, updatedAt: new Date() }).where(eq(virtualPersonsTable.id, vpId)),
  ]);

  if (analysis) {
    const [existing] = await db.select().from(profilesTable).where(eq(profilesTable.virtualPersonId, vpId));
    const mergedProfile = {
      genderPatterns: analysis.genderPatterns ?? existing?.genderPatterns ?? null,
      emotionalProfile: analysis.emotionalTone ?? existing?.emotionalProfile ?? null,
      cognitiveLevel: existing?.cognitiveLevel ?? null,
    };
    if (existing) {
      await db.update(profilesTable).set({ ...mergedProfile, updatedAt: new Date() }).where(eq(profilesTable.virtualPersonId, vpId));
    } else {
      await db.insert(profilesTable).values({ virtualPersonId: vpId, ...mergedProfile });
    }
  }

  const [updated] = await db.select().from(virtualPersonsTable).where(eq(virtualPersonsTable.id, vpId));
  res.json({
    photoUrl,
    analysis,
    person: { ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() },
  });
});

export default router;
