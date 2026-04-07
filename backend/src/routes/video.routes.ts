import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { getMyVideos, getVideosByTrainer, createVideo, deleteVideo } from "../controllers/video.controller";

const router = Router();
router.use(authenticate);

router.get("/",                          requireRole("TRAINER"), getMyVideos);
router.post("/",                         requireRole("TRAINER"), createVideo);
router.delete("/:videoId",               requireRole("TRAINER"), deleteVideo);
router.get("/trainer/:trainerId",        requireRole("CLIENT"),  getVideosByTrainer);

export default router;
