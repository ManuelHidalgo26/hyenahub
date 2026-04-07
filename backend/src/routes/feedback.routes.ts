import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { upsertFeedback, getFeedbackByRoutine } from "../controllers/feedback.controller";

const router = Router();
router.use(authenticate);

router.post("/:routineId",          requireRole("CLIENT"),  upsertFeedback);
router.get("/routine/:routineId",   requireRole("TRAINER"), getFeedbackByRoutine);

export default router;
