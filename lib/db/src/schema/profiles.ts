import { pgTable, integer, text, timestamp, jsonb, serial } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const profilesTable = pgTable("profiles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  descriptor: jsonb("descriptor").notNull().$type<number[]>(),
  sampleCount: integer("sample_count").notNull().default(1),
  
  createdAt: timestamp("created_at")
    .notNull()
    .defaultNow(),
});

export type Profile = typeof profilesTable.$inferSelect;
export type InsertProfile = typeof profilesTable.$inferInsert;
