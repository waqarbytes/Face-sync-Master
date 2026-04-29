import { Router, type IRouter } from "express";
import { db, sessionsTable, readingsTable, profilesTable } from "@workspace/db";
import { GetWellnessTrendQueryParams } from "@workspace/api-zod";
import { desc, isNotNull, sql, gte, eq, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/insights/summary", async (req, res) => {
  try {
    const profileId = req.query.profileId ? parseInt(req.query.profileId as string) : null;
    const whereClause = profileId ? eq(sessionsTable.profileId, profileId) : undefined;

    const [agg] = await db
      .select({
        totalSessions: sql<number>`COUNT(*)`,
        totalSeconds: sql<number>`COALESCE(SUM(${sessionsTable.durationSec}), 0)`,
        avgWellness: sql<number | null>`AVG(${sessionsTable.wellnessScore})`,
        bestWellness: sql<number | null>`MAX(${sessionsTable.wellnessScore})`,
        lastSessionAt: sql<Date | null>`MAX(${sessionsTable.startedAt})`,
      })
      .from(sessionsTable)
      .where(whereClause);

    const recent = await db
      .select({ date: sql<string>`TO_CHAR(${sessionsTable.startedAt}, 'YYYY-MM-DD')` })
      .from(sessionsTable)
      .where(whereClause)
      .orderBy(desc(sessionsTable.startedAt))
      .limit(60);

    const days = new Set(recent.map((r) => r.date));
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 60; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      if (days.has(key)) streak++;
      else break;
    }

    res.json({
      totalSessions: agg?.totalSessions ?? 0,
      totalMinutes: Math.round(((agg?.totalSeconds ?? 0) / 60) * 10) / 10,
      avgWellnessScore:
        agg?.avgWellness != null ? Number(agg.avgWellness) : null,
      bestWellnessScore:
        agg?.bestWellness != null ? Number(agg.bestWellness) : null,
      currentStreakDays: streak,
      lastSessionAt: agg?.lastSessionAt ?? null,
    });
  } catch (error) {
    console.error("Summary error:", error);
    res.status(500).json({ error: "Failed to load summary" });
  }
});

router.get("/insights/trend", async (req, res) => {
  try {
    const { days } = GetWellnessTrendQueryParams.parse(req.query);
    const profileId = req.query.profileId ? parseInt(req.query.profileId as string) : null;
    const d = days ?? 14;
    const since = new Date(Date.now() - d * 24 * 60 * 60 * 1000);

    const whereClauses = [gte(sessionsTable.startedAt, since)];
    if (profileId) whereClauses.push(eq(sessionsTable.profileId, profileId));

    const rows = await db
      .select({
        date: sql<string>`TO_CHAR(${sessionsTable.startedAt}, 'YYYY-MM-DD')`,
        avg: sql<number | null>`AVG(${sessionsTable.wellnessScore})`,
        count: sql<number>`COUNT(*)`,
      })
      .from(sessionsTable)
      .where(and(...whereClauses))
      .groupBy(sql`TO_CHAR(${sessionsTable.startedAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`TO_CHAR(${sessionsTable.startedAt}, 'YYYY-MM-DD')`);

    const map = new Map(
      rows.map((r) => [
        r.date,
        {
          date: r.date,
          avgWellnessScore: r.avg != null ? Number(r.avg) : null,
          sessionCount: r.count,
        },
      ]),
    );

    const out: { date: string; avgWellnessScore: number | null; sessionCount: number }[] = [];
    for (let i = d - 1; i >= 0; i--) {
      const day = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      out.push(
        map.get(day) ?? { date: day, avgWellnessScore: null, sessionCount: 0 },
      );
    }

    res.json(out);
  } catch (error) {
    console.error("Trend error:", error);
    res.status(500).json({ error: "Failed to load trends" });
  }
});

router.get("/insights/posture-breakdown", async (req, res) => {
  try {
    const profileId = req.query.profileId ? parseInt(req.query.profileId as string) : null;
    
    let query = db
      .select({
        posture: readingsTable.posture,
        count: sql<number>`COUNT(*)`,
      })
      .from(readingsTable);

    if (profileId) {
      // @ts-ignore - join requires proper typing but works in runtime
      query = query.innerJoin(sessionsTable, eq(readingsTable.sessionId, sessionsTable.id))
                   .where(eq(sessionsTable.profileId, profileId));
    }

    const rows = await query.groupBy(readingsTable.posture);

    const total = rows.reduce((s, r) => s + r.count, 0) || 1;
    res.json(
      rows.map((r) => ({
        posture: r.posture,
        count: r.count,
        ratio: r.count / total,
      })),
    );
  } catch (error) {
    console.error("Posture error:", error);
    res.status(500).json({ error: "Failed to load posture analysis" });
  }
});

router.get("/insights/emotion-breakdown", async (req, res) => {
  try {
    const profileId = req.query.profileId ? parseInt(req.query.profileId as string) : null;

    let query = db
      .select({
        emotion: readingsTable.emotion,
        count: sql<number>`COUNT(*)`,
      })
      .from(readingsTable)
      .where(isNotNull(readingsTable.emotion));

    if (profileId) {
      // @ts-ignore
      query = query.innerJoin(sessionsTable, eq(readingsTable.sessionId, sessionsTable.id))
                   .where(and(isNotNull(readingsTable.emotion), eq(sessionsTable.profileId, profileId)));
    }

    const rows = await query.groupBy(readingsTable.emotion);

    const total = rows.reduce((s, r) => s + r.count, 0) || 1;
    res.json(
      rows.map((r) => ({
        emotion: r.emotion,
        count: r.count,
        ratio: r.count / total,
      })),
    );
  } catch (error) {
    console.error("Emotion error:", error);
    res.status(500).json({ error: "Failed to load emotion analysis" });
  }
});

router.get("/insights/user-summary", async (_req, res) => {
  try {
    const rows = await db
      .select({
        profileId: profilesTable.id,
        name: profilesTable.name,
        totalSessions: sql<number>`COUNT(${sessionsTable.id})`,
        totalMinutes: sql<number>`COALESCE(SUM(${sessionsTable.durationSec}), 0) / 60`,
        avgWellnessScore: sql<number | null>`AVG(${sessionsTable.wellnessScore})`,
        lastActive: sql<Date | null>`MAX(${sessionsTable.startedAt})`,
      })
      .from(profilesTable)
      .leftJoin(sessionsTable, eq(sessionsTable.profileId, profilesTable.id))
      .groupBy(profilesTable.id, profilesTable.name)
      .orderBy(desc(sql`MAX(${sessionsTable.startedAt})`));

    res.json(rows);
  } catch (error) {
    console.error("User summary error:", error);
    res.status(500).json({ error: "Failed to load user summaries" });
  }
});

export default router;
