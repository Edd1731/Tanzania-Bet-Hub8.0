import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import eventsRouter from "./events";
import betsRouter from "./bets";
import depositsRouter from "./deposits";
import withdrawalsRouter from "./withdrawals";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(eventsRouter);
router.use(betsRouter);
router.use(depositsRouter);
router.use(withdrawalsRouter);
router.use(adminRouter);

export default router;
