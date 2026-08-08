/**
 * Text extraction for chat attachments.
 * POST /extract-text — accepts .txt, .pdf, .docx, and images (via Vision OCR),
 * returns { filename, text }. No auth required so free-form chat can use it too,
 * therefore it is rate-limited per IP and validates file signatures server-side.
 */
import { Router } from "express";
import multer from "multer";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const MAX_CHARS = 60000;

// --- Simple in-memory per-IP rate limiter (anonymous endpoint) ---
const WINDOW_MS = 5 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 20;
const buckets = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  bucket.count++;
  return bucket.count > MAX_REQUESTS_PER_WINDOW;
}

// Periodically prune stale buckets
setInterval(() => {
  const now = Date.now();
  for (const [ip, b] of buckets) if (now > b.resetAt) buckets.delete(ip);
}, WINDOW_MS).unref();

// --- File signature (magic byte) validation; MIME type is client-controlled ---
type FileKind = "text" | "pdf" | "docx" | "image";

function sniffKind(buffer: Buffer, mimetype: string): FileKind | null {
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString("latin1") === "%PDF-") return "pdf";
  // DOCX (and other OOXML) are ZIP containers: PK\x03\x04
  if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) return "docx";
  // Legacy .doc (OLE compound file): D0 CF 11 E0 — explicitly unsupported
  if (buffer.length >= 4 && buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0) return null;
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer.subarray(1, 4).toString("latin1") === "PNG") return "image"; // png
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image"; // jpeg
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString("latin1") === "RIFF" && buffer.subarray(8, 12).toString("latin1") === "WEBP") return "image"; // webp
  if (mimetype === "text/plain" || mimetype.startsWith("text/")) {
    // Reject if it looks binary (NUL bytes in first 8KB)
    const head = buffer.subarray(0, 8192);
    if (!head.includes(0)) return "text";
  }
  return null;
}

router.post("/extract-text", upload.single("file"), async (req, res): Promise<void> => {
  const ip = req.ip ?? "unknown";
  if (rateLimited(ip)) {
    res.status(429).json({ error: "Too many uploads. Please wait a few minutes and try again." });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  const { mimetype, buffer, originalname } = req.file;
  const kind = sniffKind(buffer, mimetype);

  if (!kind) {
    res.status(400).json({
      error: `Unsupported file type for ${originalname}. Upload .txt, .pdf, .docx, or an image (PNG/JPG/WebP). Legacy .doc files aren't supported — please re-save as .docx.`,
    });
    return;
  }

  let text = "";
  try {
    if (kind === "text") {
      text = buffer.toString("utf-8");
    } else if (kind === "pdf") {
      // pdf.js-based parsers break under esbuild bundling (worker file not emitted);
      // poppler's pdftotext is available in the Replit runtime and far more robust.
      const { execFile } = await import("node:child_process");
      const { promisify } = await import("node:util");
      const { writeFile, unlink } = await import("node:fs/promises");
      const { tmpdir } = await import("node:os");
      const { join } = await import("node:path");
      const tmpPath = join(tmpdir(), `extract-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`);
      await writeFile(tmpPath, buffer);
      try {
        const { stdout } = await promisify(execFile)("pdftotext", ["-layout", tmpPath, "-"], {
          maxBuffer: 10 * 1024 * 1024,
          timeout: 30000,
        });
        text = stdout;
      } finally {
        await unlink(tmpPath).catch(() => {});
      }
    } else if (kind === "docx") {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else {
      // image → Vision OCR (magic bytes already validated)
      const detectedMime = buffer[0] === 0x89 ? "image/png" : buffer[0] === 0xff ? "image/jpeg" : "image/webp";
      const base64 = buffer.toString("base64");
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 4096,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: "Extract ALL text from this image verbatim. Return only the extracted text." },
            { type: "image_url", image_url: { url: `data:${detectedMime};base64,${base64}`, detail: "high" } },
          ],
        }],
      });
      text = response.choices[0]?.message?.content ?? "";
    }
  } catch (err) {
    req.log.error({ err }, "Text extraction failed");
    res.status(422).json({ error: `Could not extract text from ${originalname}` });
    return;
  }

  text = text.trim().slice(0, MAX_CHARS);
  if (!text) {
    res.status(422).json({ error: `No readable text found in ${originalname}` });
    return;
  }

  res.json({ filename: originalname, text });
});

export default router;
