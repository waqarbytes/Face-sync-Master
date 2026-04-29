import { Router, type IRouter } from "express";
import { db, baselineTable } from "@workspace/db";
import { UpdateBaselineBody } from "@workspace/api-zod";
import { desc } from "drizzle-orm";

const router: IRouter = Router();

const DEFAULT_BASELINE = {
  earOpen: 0.32,
  marClosed: 0.05,
  neutralPitch: 0,
  neutralYaw: 0,
};

async function ensureBaseline() {
  const [existing] = await db
    .select()
    .from(baselineTable)
    .orderBy(desc(baselineTable.updatedAt))
    .limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(baselineTable)
    .values(DEFAULT_BASELINE)
    .returning();
  return created!;
}

router.get("/baseline", async (_req, res) => {
  const row = await ensureBaseline();
  res.json(row);
});

router.put("/baseline", async (req, res) => {
  const body = UpdateBaselineBody.parse(req.body);
  await ensureBaseline();
  const [row] = await db
    .insert(baselineTable)
    .values({ ...body })
    .returning();
  res.json(row);
});

export default router;
