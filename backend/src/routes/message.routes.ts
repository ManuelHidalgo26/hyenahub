import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { getConversation, getUnreadCount, sendMessage } from "../controllers/message.controller";

const router = Router();
router.use(authenticate);

router.get("/unread-count",      getUnreadCount);
router.get("/:otherUserId",      getConversation);
router.post("/:otherUserId",     sendMessage);

export default router;
