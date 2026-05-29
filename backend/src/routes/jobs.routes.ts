import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";

const router = Router();

// All job triggers require admin auth
router.use(authenticate, requireRole("ADMIN"));

// Placeholder — add scheduled job triggers here.
// Examples:
//   POST /jobs/cleanup-tokens   — delete expired refresh tokens
//   POST /jobs/weekly-reminders — send weekly summary emails to clients

export default router;
