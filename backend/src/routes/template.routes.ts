import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { getMyTemplates, createTemplate, deleteTemplate } from "../controllers/template.controller";

const router = Router();
router.use(authenticate, requireRole("TRAINER"));

router.get("/",                  getMyTemplates);
router.post("/",                 createTemplate);
router.delete("/:templateId",    deleteTemplate);

export default router;
