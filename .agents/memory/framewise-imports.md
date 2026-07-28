---
name: FrameWise page file import pattern
description: Design subagent builds profile components only; appending new components requires deduplicating imports at the top of the file
---

# FrameWise Page File Import Pattern

## Rule
The design subagent builds only the profile component (RelationshipProfile, VirtualPersonProfile) in the page files. When additional components (Relationships, NewRelationship, RelationshipView, VirtualPersons, etc.) need to be added, do NOT use `cat >> file` — it creates duplicate import declarations that crash Babel/Vite.

**Why:** Vite uses Babel's scope analysis which treats duplicate `import { useState }` as a fatal error, even if the identifiers are the same.

## How to apply
1. Read the existing imports at the top of the file.
2. Consolidate ALL needed imports (original + new) into the top import block via Edit.
3. Write new component functions after the existing ones — no import block.
4. The `cat >>` append approach only works if the appended code has zero import statements.
