import { Router, type IRouter } from "express";
import { db, sessionsTable, readingsTable, profilesTable } from "@workspace/db";
import {
  CreateSessionBody,
  EndSessionBody,
  EndSessionParams,
  GetSessionParams,
  ListSessionsQueryParams,
} from "@workspace/api-zod";
import { desc, eq, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/sessions", async (req, res) => {
  try {
    const { limit } = ListSessionsQueryParams.parse(req.query);
    const lim = limit ?? 20;

    const profileId = req.query.profileId ? parseInt(req.query.profileId as string) : null;
    const whereClause = profileId ? eq(sessionsTable.profileId, profileId) : undefined;

    const rows = await db
      .select({
        id: sessionsTable.id,
        profileId: sessionsTable.profileId,
        profileName: profilesTable.name,
        label: sessionsTable.label,
        startedAt: sessionsTable.startedAt,
        endedAt: sessionsTable.endedAt,
        durationSec: sessionsTable.durationSec,
        wellnessScore: sessionsTable.wellnessScore,
        avgEar: sessionsTable.avgEar,
        avgMar: sessionsTable.avgMar,
        avgPosturePenalty: sessionsTable.avgPosturePenalty,
        dominantEmotion: sessionsTable.dominantEmotion,
        readingCount: sql<number>`(
          SELECT COUNT(*) FROM ${readingsTable}
          WHERE ${readingsTable.sessionId} = ${sessionsTable.id}
        )`,
      })
      .from(sessionsTable)
      .leftJoin(profilesTable, eq(sessionsTable.profileId, profilesTable.id))
      .where(whereClause)
      .orderBy(desc(sessionsTable.startedAt))
      .limit(lim);

    res.json(rows);
  } catch (error) {
    console.error("List sessions error:", error);
    res.status(500).json({ error: "Failed to list sessions" });
  }
});

router.post("/sessions", async (req, res) => {
  try {
    const body = CreateSessionBody.parse(req.body ?? {});
    const [row] = await db
      .insert(sessionsTable)
      .values({ 
        label: body.label ?? null,
        profileId: body.profileId ?? null,
      })
      .returning();
    res.status(201).json({ ...row, readingCount: 0 });
  } catch (error) {
    console.error("Create session error:", error);
    res.status(500).json({ error: "Failed to create session" });
  }
});

router.get("/sessions/:id", async (req, res) => {
  try {
    const { id } = GetSessionParams.parse(req.params);

    const [row] = await db
      .select({
        id: sessionsTable.id,
        profileId: sessionsTable.profileId,
        profileName: profilesTable.name,
        label: sessionsTable.label,
        startedAt: sessionsTable.startedAt,
        endedAt: sessionsTable.endedAt,
        durationSec: sessionsTable.durationSec,
        wellnessScore: sessionsTable.wellnessScore,
        avgEar: sessionsTable.avgEar,
        avgMar: sessionsTable.avgMar,
        avgPosturePenalty: sessionsTable.avgPosturePenalty,
        dominantEmotion: sessionsTable.dominantEmotion,
      })
      .from(sessionsTable)
      .leftJoin(profilesTable, eq(sessionsTable.profileId, profilesTable.id))
      .where(eq(sessionsTable.id, id));

    if (!row) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const counts = await db
      .select({ posture: readingsTable.posture, count: sql<number>`COUNT(*)` })
      .from(readingsTable)
      .where(eq(readingsTable.sessionId, id))
      .groupBy(readingsTable.posture);

    const emoCounts = await db
      .select({ emotion: readingsTable.emotion, count: sql<number>`COUNT(*)` })
      .from(readingsTable)
      .where(eq(readingsTable.sessionId, id))
      .groupBy(readingsTable.emotion);

    const total = counts.reduce((s, r) => s + r.count, 0) || 1;
    const totalE = emoCounts.reduce((s, r) => s + r.count, 0) || 1;

    const [{ readingCount } = { readingCount: 0 }] = await db
      .select({ readingCount: sql<number>`COUNT(*)` })
      .from(readingsTable)
      .where(eq(readingsTable.sessionId, id));

    res.json({
      ...row,
      readingCount,
      postureBreakdown: counts.map((c) => ({
        posture: c.posture,
        count: c.count,
        ratio: c.count / total,
      })),
      emotionBreakdown: emoCounts.map((c) => ({
        emotion: c.emotion,
        count: c.count,
        ratio: c.count / totalE,
      })),
    });
  } catch (error) {
    console.error("Get session error:", error);
    res.status(500).json({ error: "Failed to get session details" });
  }
});

router.patch("/sessions/:id", async (req, res) => {
  try {
    const { id } = EndSessionParams.parse(req.params);
    // Use passthrough() so extra fields like profileId don't cause validation errors
    const body = EndSessionBody.passthrough().parse(req.body);

    const [row] = await db
      .update(sessionsTable)
      .set({
        endedAt: new Date(),
        durationSec: body.durationSec,
        wellnessScore: body.wellnessScore,
        avgEar: body.avgEar,
        avgMar: body.avgMar,
        avgPosturePenalty: body.avgPosturePenalty,
        dominantEmotion: body.dominantEmotion,
        ...((body as any).profileId ? { profileId: (body as any).profileId } : {}),
      })
      .where(eq(sessionsTable.id, id))
      .returning();

    if (!row) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    // TODO: Add learning behavior once profile schema includes baseline columns

    const [{ readingCount } = { readingCount: 0 }] = await db
      .select({ readingCount: sql<number>`COUNT(*)` })
      .from(readingsTable)
      .where(eq(readingsTable.sessionId, id));

    res.json({ ...row, readingCount });
  } catch (error: any) {
    console.error("Update session error:", error?.message, error?.issues || "");
    res.status(500).json({ error: "Failed to end session", details: error?.message });
  }
});

router.patch("/sessions/:id/identify", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { profileId } = req.body;
    
    console.log(`[IDENTIFY] Updating session ${id} with profileId: ${profileId}`);
    
    await db.update(sessionsTable)
      .set({ profileId })
      .where(eq(sessionsTable.id, id));
      
    res.json({ success: true, profileId });
  } catch (error) {
    console.error("Identify session error:", error);
    res.status(500).json({ error: "Failed to update session identity" });
  }
});

export default router;
