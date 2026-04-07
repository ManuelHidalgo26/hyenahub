import { Router } from "express";
import { register, login, me, listTrainers, refresh, logout } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticate, me);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/trainers", listTrainers);

export default router;
