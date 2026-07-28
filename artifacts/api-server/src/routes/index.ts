import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import personsRouter from "./persons";
import virtualPersonsRouter from "./virtual-persons";
import conversationsRouter from "./conversations";
import messagesRouter from "./messages";
import documentsRouter from "./documents";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(personsRouter);
router.use(virtualPersonsRouter);
router.use(conversationsRouter);
router.use(messagesRouter);
router.use(documentsRouter);
router.use(dashboardRouter);

export default router;
