import { pgTable, integer, real, timestamp, serial } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const baselineTable = pgTable("baseline", {
  id: serial("id").primaryKey(),
  earOpen: real("ear_open").notNull(),
  marClosed: real("mar_closed").notNull(),
  neutralPitch: real("neutral_pitch").notNull(),
  neutralYaw: real("neutral_yaw").notNull(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow(),
});

export type Baseline = typeof baselineTable.$inferSelect;
