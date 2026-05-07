import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import {
  getDietTemplates,
  createDietTemplate,
  updateDietTemplate,
  deleteDietTemplate,
} from "../controllers/diet-template.controller";

const router = Router();

router.use(authenticate, requireRole("TRAINER"));

router.get("/",    getDietTemplates);
router.post("/",   createDietTemplate);
router.patch("/:id", updateDietTemplate);
router.delete("/:id", deleteDietTemplate);

export default router;
