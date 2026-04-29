import { pgTable, integer, text, real, timestamp, serial } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const sessionsTable = pgTable("sessions", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id"),
  label: text("label"),
  startedAt: timestamp("started_at")
    .notNull()
    .defaultNow(),
  endedAt: timestamp("ended_at"),
  durationSec: integer("duration_sec"),
  wellnessScore: real("wellness_score"),
  avgEar: real("avg_ear"),
  avgMar: real("avg_mar"),
  avgPosturePenalty: real("avg_posture_penalty"),
  dominantEmotion: text("dominant_emotion"),
});

export type Session = typeof sessionsTable.$inferSelect;
export type InsertSession = typeof sessionsTable.$inferInsert;
