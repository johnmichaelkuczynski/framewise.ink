---
name: PDF text extraction in bundled Node servers
description: Why pdf-parse fails under esbuild bundling and what to use instead
---
Rule: for server-side PDF text extraction in this workspace, shell out to poppler's `pdftotext` (present in the Replit runtime PATH) instead of pdf.js-based npm packages.

**Why:** `pdf-parse` v2 wraps pdf.js, which needs `DOMMatrix` polyfills (`@napi-rs/canvas`) and a separate `pdf.worker.mjs` file that esbuild bundling does not emit — it fails at runtime with "Setting up fake worker failed". `pdftotext -layout <file> -` just works.

**How to apply:** any api-server route needing PDF text: write buffer to a tmp file, `execFile("pdftotext", ["-layout", tmp, "-"])`, clean up in `finally`. DOCX → `mammoth.extractRawText`. Legacy binary .doc (magic D0 CF 11 E0) is unsupported — reject with a clear message.
