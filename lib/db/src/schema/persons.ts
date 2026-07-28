import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const personsTable = pgTable("persons", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  relationship: text("relationship"),
  gender: text("gender"),
  notes: text("notes"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPersonSchema = createInsertSchema(personsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPerson = z.infer<typeof insertPersonSchema>;
export type Person = typeof personsTable.$inferSelect;

export const virtualPersonsTable = pgTable("virtual_persons", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  gender: text("gender"),
  cognitiveStyle: text("cognitive_style"),
  emotionalStyle: text("emotional_style"),
  sensitivities: text("sensitivities"),
  backstory: text("backstory"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertVirtualPersonSchema = createInsertSchema(virtualPersonsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVirtualPerson = z.infer<typeof insertVirtualPersonSchema>;
export type VirtualPerson = typeof virtualPersonsTable.$inferSelect;
