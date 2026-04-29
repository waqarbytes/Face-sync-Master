import { pgTable, integer, text, real, timestamp, index, serial } from "drizzle-orm/pg-core";
import { sessionsTable } from "./sessions";

export const readingsTable = pgTable(
  "readings",
  {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id")
      .notNull()
      .references(() => sessionsTable.id, { onDelete: "cascade" }),
    capturedAt: timestamp("captured_at").notNull(),
    ear: real("ear").notNull(),
    mar: real("mar").notNull(),
    yaw: real("yaw").notNull(),
    pitch: real("pitch").notNull(),
    roll: real("roll").notNull(),
    posture: text("posture").notNull(),
    emotion: text("emotion").notNull(),
    emotionConfidence: real("emotion_confidence").notNull(),
    wellnessScore: real("wellness_score").notNull(),
  },
  (t) => ({
    sessionIdx: index("readings_session_idx").on(t.sessionId),
    capturedIdx: index("readings_captured_idx").on(t.capturedAt),
  }),
);

export type Reading = typeof readingsTable.$inferSelect;
export type InsertReading = typeof readingsTable.$inferInsert;
