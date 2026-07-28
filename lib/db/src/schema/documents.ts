import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { personsTable, virtualPersonsTable } from "./persons";

export const documentsTable = pgTable("documents", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  personId: integer("person_id").references(() => personsTable.id, { onDelete: "set null" }),
  virtualPersonId: integer("virtual_person_id").references(() => virtualPersonsTable.id, { onDelete: "set null" }),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  extractedText: text("extracted_text"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDocumentSchema = createInsertSchema(documentsTable).omit({ id: true, createdAt: true });
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documentsTable.$inferSelect;
