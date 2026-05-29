import { Router } from "express";

const router = Router();

// Webhooks from external services — no session auth, validate with HMAC signatures instead.
// Examples:
//   POST /webhooks/stripe   — payment events
//   POST /webhooks/mercadopago — payment events (LATAM)

export default router;
