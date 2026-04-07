import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import {
  createDiet,
  getDietsByClient,
  updateDiet,
  deleteDiet,
  getMyDiets,
} from "../controllers/diet.controller";

const router = Router();

router.use(authenticate);

// Trainer routes
router.post("/",                        requireRole("TRAINER"), createDiet);
router.get("/client/:clientId",         requireRole("TRAINER"), getDietsByClient);
router.put("/:dietId",                  requireRole("TRAINER"), updateDiet);
router.delete("/:dietId",              requireRole("TRAINER"), deleteDiet);

// Client routes
router.get("/my",                       requireRole("CLIENT"),  getMyDiets);

export default router;
