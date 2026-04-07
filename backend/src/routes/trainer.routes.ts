import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import {
  getClients,
  getClientById,
  updateClient,
  getDashboard,
} from "../controllers/trainer.controller";

const router = Router();

router.use(authenticate, requireRole("TRAINER"));

router.get("/dashboard", getDashboard);
router.get("/clients", getClients);
router.get("/clients/:clientId", getClientById);
router.patch("/clients/:clientId", updateClient);

export default router;
