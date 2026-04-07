import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { updateAvatar, getMe, getMyTrainer } from "../controllers/profile.controller";

const router = Router();
router.use(authenticate);

router.get("/me",           getMe);
router.patch("/avatar",     updateAvatar);
router.get("/my-trainer",   requireRole("CLIENT"), getMyTrainer);

export default router;
