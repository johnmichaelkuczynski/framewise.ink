import { Router } from "express";
import multer from "multer";
import { eq, and } from "drizzle-orm";
import { db, documentsTable } from "@workspace/db";
import { GetDocumentParams, DeleteDocumentParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

router.use(requireAuth);

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter(_req, file, cb) {
    const allowed = [
      "text/plain",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ...IMAGE_TYPES,
    ];
    if (allowed.includes(file.mimetype) || file.mimetype.startsWith("text/")) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type. Upload .txt, .pdf, .doc, .docx, or an image."));
    }
  },
});

async function ocrWithVision(buffer: Buffer, mimeType: string): Promise<string> {
  const base64 = buffer.toString("base64");
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Extract ALL text from this image verbatim. Preserve the original layout and formatting as much as possible. Return only the extracted text — no commentary, no explanations.",
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64}`,
              detail: "high",
            },
          },
        ],
      },
    ],
  });
  return response.choices[0]?.message?.content ?? "";
}

// GET /documents
router.get("/documents", async (req, res): Promise<void> => {
  const docs = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.userId, req.user!.id))
    .orderBy(documentsTable.createdAt);
  res.json(docs.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() })));
});

// POST /documents (multipart upload — text, PDF, or image OCR)
router.post("/documents", upload.single("file"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  const personId = req.body.personId ? parseInt(req.body.personId, 10) : null;
  const virtualPersonId = req.body.virtualPersonId
    ? parseInt(req.body.virtualPersonId, 10)
    : null;

  let extractedText: string | null = null;

  if (req.file.mimetype === "text/plain") {
    extractedText = req.file.buffer.toString("utf-8").slice(0, 50000);
  } else if (IMAGE_TYPES.includes(req.file.mimetype)) {
    try {
      extractedText = await ocrWithVision(req.file.buffer, req.file.mimetype);
    } catch (err) {
      req.log.warn({ err }, "Vision OCR failed, saving document without text");
    }
  }

  const [doc] = await db
    .insert(documentsTable)
    .values({
      userId: req.user!.id,
      personId: personId || null,
      virtualPersonId: virtualPersonId || null,
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
      extractedText,
    })
    .returning();

  res.status(201).json({ ...doc, createdAt: doc.createdAt.toISOString() });
});

// GET /documents/:id
router.get("/documents/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = GetDocumentParams.safeParse({ id: parseInt(raw, 10) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [doc] = await db
    .select()
    .from(documentsTable)
    .where(and(eq(documentsTable.id, parsed.data.id), eq(documentsTable.userId, req.user!.id)));
  if (!doc) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...doc, createdAt: doc.createdAt.toISOString() });
});

// DELETE /documents/:id
router.delete("/documents/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = DeleteDocumentParams.safeParse({ id: parseInt(raw, 10) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  await db
    .delete(documentsTable)
    .where(and(eq(documentsTable.id, parsed.data.id), eq(documentsTable.userId, req.user!.id)));
  res.json({ success: true });
});

export default router;
