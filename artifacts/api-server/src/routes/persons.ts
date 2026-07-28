import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, personsTable, profilesTable } from "@workspace/db";
import {
  CreatePersonBody,
  UpdatePersonBody,
  GetPersonParams,
  UpdatePersonParams,
  DeletePersonParams,
  GetPersonProfileParams,
  UpdatePersonProfileParams,
  UpdatePersonProfileBody,
  GetPersonSummaryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.use(requireAuth);

// GET /persons
router.get("/persons", async (req, res): Promise<void> => {
  const persons = await db
    .select()
    .from(personsTable)
    .where(eq(personsTable.userId, req.user!.id))
    .orderBy(personsTable.createdAt);
  res.json(persons.map((p) => ({ ...p, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() })));
});

// POST /persons
router.post("/persons", async (req, res): Promise<void> => {
  const parsed = CreatePersonBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [person] = await db
    .insert(personsTable)
    .values({ ...parsed.data, userId: req.user!.id })
    .returning();
  // Create default profile
  await db.insert(profilesTable).values({ personId: person.id });
  res.status(201).json({ ...person, createdAt: person.createdAt.toISOString(), updatedAt: person.updatedAt.toISOString() });
});

// GET /persons/:id
router.get("/persons/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = GetPersonParams.safeParse({ id: parseInt(raw, 10) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [person] = await db
    .select()
    .from(personsTable)
    .where(and(eq(personsTable.id, parsed.data.id), eq(personsTable.userId, req.user!.id)));
  if (!person) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...person, createdAt: person.createdAt.toISOString(), updatedAt: person.updatedAt.toISOString() });
});

// PATCH /persons/:id
router.patch("/persons/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const paramParsed = UpdatePersonParams.safeParse({ id: parseInt(raw, 10) });
  const bodyParsed = UpdatePersonBody.safeParse(req.body);
  if (!paramParsed.success || !bodyParsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [updated] = await db
    .update(personsTable)
    .set({ ...bodyParsed.data, updatedAt: new Date() })
    .where(and(eq(personsTable.id, paramParsed.data.id), eq(personsTable.userId, req.user!.id)))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

// DELETE /persons/:id
router.delete("/persons/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = DeletePersonParams.safeParse({ id: parseInt(raw, 10) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  await db
    .delete(personsTable)
    .where(and(eq(personsTable.id, parsed.data.id), eq(personsTable.userId, req.user!.id)));
  res.json({ success: true });
});

// GET /persons/:id/profile
router.get("/persons/:id/profile", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = GetPersonProfileParams.safeParse({ id: parseInt(raw, 10) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [profile] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.personId, parsed.data.id));
  if (!profile) {
    const [newProfile] = await db.insert(profilesTable).values({ personId: parsed.data.id }).returning();
    res.json({ ...newProfile, updatedAt: newProfile.updatedAt.toISOString() });
    return;
  }
  res.json({ ...profile, updatedAt: profile.updatedAt.toISOString() });
});

// PATCH /persons/:id/profile
router.patch("/persons/:id/profile", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const paramParsed = UpdatePersonProfileParams.safeParse({ id: parseInt(raw, 10) });
  const bodyParsed = UpdatePersonProfileBody.safeParse(req.body);
  if (!paramParsed.success || !bodyParsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [existing] = await db.select().from(profilesTable).where(eq(profilesTable.personId, paramParsed.data.id));
  if (!existing) {
    const [created] = await db.insert(profilesTable).values({ personId: paramParsed.data.id, ...bodyParsed.data }).returning();
    res.json({ ...created, updatedAt: created.updatedAt.toISOString() });
    return;
  }
  const [updated] = await db
    .update(profilesTable)
    .set({ ...bodyParsed.data, updatedAt: new Date() })
    .where(eq(profilesTable.personId, paramParsed.data.id))
    .returning();
  res.json({ ...updated, updatedAt: updated.updatedAt.toISOString() });
});

// GET /persons/:id/summary
router.get("/persons/:id/summary", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = GetPersonSummaryParams.safeParse({ id: parseInt(raw, 10) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [person] = await db.select().from(personsTable).where(and(eq(personsTable.id, parsed.data.id), eq(personsTable.userId, req.user!.id)));
  if (!person) { res.status(404).json({ error: "Not found" }); return; }
  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.personId, parsed.data.id));
  const worked = profile?.whatWorked ?? [];
  const failed = profile?.whatFailed ?? [];
  const total = worked.length + failed.length;
  const successRate = total > 0 ? worked.length / total : null;
  const insights: string[] = [];
  if (profile?.cognitiveLevel) insights.push(`Cognitive level: ${profile.cognitiveLevel}`);
  if (profile?.emotionalProfile) insights.push(`Emotional profile: ${profile.emotionalProfile}`);
  if (worked.length > 0) insights.push(`What works: ${worked.slice(0, 2).join("; ")}`);
  if (failed.length > 0) insights.push(`What fails: ${failed.slice(0, 2).join("; ")}`);
  res.json({
    personId: person.id,
    name: person.name,
    totalInteractions: total,
    successRate,
    keyInsights: insights,
    recentTrend: profile?.optimizationRoadmap ?? null,
  });
});

export default router;
