import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { getConversation, getUnreadCount } from "../controllers/message.controller";

const router = Router();
router.use(authenticate);

router.get("/unread-count",      getUnreadCount);
router.get("/:otherUserId",      getConversation);

export default router;
