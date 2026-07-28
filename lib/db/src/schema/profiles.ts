import { pgTable, serial, text, integer, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { personsTable, virtualPersonsTable } from "./persons";

export const profilesTable = pgTable("profiles", {
  id: serial("id").primaryKey(),
  personId: integer("person_id").references(() => personsTable.id, { onDelete: "cascade" }),
  virtualPersonId: integer("virtual_person_id").references(() => virtualPersonsTable.id, { onDelete: "cascade" }),
  genderPatterns: text("gender_patterns"),
  cognitiveLevel: text("cognitive_level"),
  emotionalProfile: text("emotional_profile"),
  whatWorked: json("what_worked").$type<string[]>().default([]).notNull(),
  whatFailed: json("what_failed").$type<string[]>().default([]).notNull(),
  sayThis: json("say_this").$type<string[]>().default([]).notNull(),
  neverSayThis: json("never_say_this").$type<string[]>().default([]).notNull(),
  affirmationLevers: text("affirmation_levers"),
  pressureLevers: text("pressure_levers"),
  optimizationRoadmap: text("optimization_roadmap"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProfileSchema = createInsertSchema(profilesTable).omit({ id: true, updatedAt: true });
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profilesTable.$inferSelect;
