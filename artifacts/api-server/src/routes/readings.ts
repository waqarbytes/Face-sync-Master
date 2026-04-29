import { Router, type IRouter } from "express";
import { db, readingsTable } from "@workspace/db";
import {
  AppendReadingsBody,
  AppendReadingsParams,
  ListReadingsParams,
  ListReadingsQueryParams,
} from "@workspace/api-zod";
import { asc, eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/sessions/:id/readings", async (req, res) => {
  const { id } = ListReadingsParams.parse(req.params);
  const { limit } = ListReadingsQueryParams.parse(req.query);
  const lim = limit ?? 1000;

  const rows = await db
    .select()
    .from(readingsTable)
    .where(eq(readingsTable.sessionId, id))
    .orderBy(asc(readingsTable.capturedAt))
    .limit(lim);

  res.json(rows);
});

router.post("/sessions/:id/readings", async (req, res) => {
  const { id } = AppendReadingsParams.parse(req.params);
  const body = AppendReadingsBody.parse(req.body);

  if (body.readings.length === 0) {
    res.status(201).json({ inserted: 0 });
    return;
  }

  const values = body.readings.map((r) => ({
    sessionId: id,
    capturedAt: new Date(r.capturedAt),
    ear: r.ear,
    mar: r.mar,
    yaw: r.yaw,
    pitch: r.pitch,
    roll: r.roll,
    posture: r.posture,
    emotion: r.emotion,
    emotionConfidence: r.emotionConfidence,
    wellnessScore: r.wellnessScore,
  }));

  await db.insert(readingsTable).values(values);
  res.status(201).json({ inserted: values.length });
});

export default router;
