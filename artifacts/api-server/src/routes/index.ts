import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import freeChatRouter from "./free-chat";
import personsRouter from "./persons";
import virtualPersonsRouter from "./virtual-persons";
import conversationsRouter from "./conversations";
import messagesRouter from "./messages";
import documentsRouter from "./documents";
import photosRouter from "./photos";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(freeChatRouter);
router.use(personsRouter);
router.use(virtualPersonsRouter);
router.use(conversationsRouter);
router.use(messagesRouter);
router.use(documentsRouter);
router.use(photosRouter);
router.use(dashboardRouter);

export default router;
