import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, virtualPersonsTable, profilesTable } from "@workspace/db";
import {
  CreateVirtualPersonBody,
  UpdateVirtualPersonBody,
  GetVirtualPersonParams,
  UpdateVirtualPersonParams,
  DeleteVirtualPersonParams,
  GetVirtualPersonProfileParams,
  UpdateVirtualPersonProfileParams,
  UpdateVirtualPersonProfileBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.use(requireAuth);

// GET /virtual-persons
router.get("/virtual-persons", async (req, res): Promise<void> => {
  const vps = await db
    .select()
    .from(virtualPersonsTable)
    .where(eq(virtualPersonsTable.userId, req.user!.id))
    .orderBy(virtualPersonsTable.createdAt);
  res.json(vps.map((p) => ({ ...p, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() })));
});

// POST /virtual-persons
router.post("/virtual-persons", async (req, res): Promise<void> => {
  const parsed = CreateVirtualPersonBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [vp] = await db
    .insert(virtualPersonsTable)
    .values({ ...parsed.data, userId: req.user!.id })
    .returning();
  await db.insert(profilesTable).values({ virtualPersonId: vp.id });
  res.status(201).json({ ...vp, createdAt: vp.createdAt.toISOString(), updatedAt: vp.updatedAt.toISOString() });
});

// GET /virtual-persons/:id
router.get("/virtual-persons/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = GetVirtualPersonParams.safeParse({ id: parseInt(raw, 10) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [vp] = await db
    .select()
    .from(virtualPersonsTable)
    .where(and(eq(virtualPersonsTable.id, parsed.data.id), eq(virtualPersonsTable.userId, req.user!.id)));
  if (!vp) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...vp, createdAt: vp.createdAt.toISOString(), updatedAt: vp.updatedAt.toISOString() });
});

// PATCH /virtual-persons/:id
router.patch("/virtual-persons/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const paramParsed = UpdateVirtualPersonParams.safeParse({ id: parseInt(raw, 10) });
  const bodyParsed = UpdateVirtualPersonBody.safeParse(req.body);
  if (!paramParsed.success || !bodyParsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [updated] = await db
    .update(virtualPersonsTable)
    .set({ ...bodyParsed.data, updatedAt: new Date() })
    .where(and(eq(virtualPersonsTable.id, paramParsed.data.id), eq(virtualPersonsTable.userId, req.user!.id)))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

// DELETE /virtual-persons/:id
router.delete("/virtual-persons/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = DeleteVirtualPersonParams.safeParse({ id: parseInt(raw, 10) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  await db
    .delete(virtualPersonsTable)
    .where(and(eq(virtualPersonsTable.id, parsed.data.id), eq(virtualPersonsTable.userId, req.user!.id)));
  res.json({ success: true });
});

// GET /virtual-persons/:id/profile
router.get("/virtual-persons/:id/profile", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = GetVirtualPersonProfileParams.safeParse({ id: parseInt(raw, 10) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.virtualPersonId, parsed.data.id));
  if (!profile) {
    const [np] = await db.insert(profilesTable).values({ virtualPersonId: parsed.data.id }).returning();
    res.json({ ...np, updatedAt: np.updatedAt.toISOString() });
    return;
  }
  res.json({ ...profile, updatedAt: profile.updatedAt.toISOString() });
});

// PATCH /virtual-persons/:id/profile
router.patch("/virtual-persons/:id/profile", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const paramParsed = UpdateVirtualPersonProfileParams.safeParse({ id: parseInt(raw, 10) });
  const bodyParsed = UpdateVirtualPersonProfileBody.safeParse(req.body);
  if (!paramParsed.success || !bodyParsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [existing] = await db.select().from(profilesTable).where(eq(profilesTable.virtualPersonId, paramParsed.data.id));
  if (!existing) {
    const [created] = await db.insert(profilesTable).values({ virtualPersonId: paramParsed.data.id, ...bodyParsed.data }).returning();
    res.json({ ...created, updatedAt: created.updatedAt.toISOString() });
    return;
  }
  const [updated] = await db
    .update(profilesTable)
    .set({ ...bodyParsed.data, updatedAt: new Date() })
    .where(eq(profilesTable.virtualPersonId, paramParsed.data.id))
    .returning();
  res.json({ ...updated, updatedAt: updated.updatedAt.toISOString() });
});

export default router;
