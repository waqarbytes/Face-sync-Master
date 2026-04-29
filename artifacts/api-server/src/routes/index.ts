import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sessionsRouter from "./sessions";
import readingsRouter from "./readings";
import baselineRouter from "./baseline";
import insightsRouter from "./insights";
import profilesRouter from "./profiles";

const router: IRouter = Router();

router.use(healthRouter);
router.use(sessionsRouter);
router.use(readingsRouter);
router.use(baselineRouter);
router.use(insightsRouter);
router.use(profilesRouter);

export default router;
