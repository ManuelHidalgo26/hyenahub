import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { getTrainers, getStats, getAllUsers, deleteUser } from "../controllers/admin.controller";

const router = Router();

router.use(authenticate, requireRole("ADMIN"));

router.get("/stats",           getStats);
router.get("/trainers",        getTrainers);
router.get("/users",           getAllUsers);
router.delete("/users/:userId", deleteUser);

export default router;
