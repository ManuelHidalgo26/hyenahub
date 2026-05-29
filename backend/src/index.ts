import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import aiRoutes       from "./routes/ai.routes";
import jobsRoutes     from "./routes/jobs.routes";
import webhooksRoutes from "./routes/webhooks.routes";

// ─── Startup validation ──────────────────────────────────────────────────────
const REQUIRED_ENV = ["DATABASE_URL", "JWT_SECRET"];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`❌  Missing required env variable: ${key}`);
    process.exit(1);
  }
}

const app = express();
const httpServer = http.createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const PORT = process.env.PORT || 4000;

// ─── Middlewares ─────────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
}));
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: "1mb" }));

// Rate limiter general — 200 req / 15 min por IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Demasiadas solicitudes. Intenta en 15 minutos." },
});

app.use("/api", globalLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
// AI: genera rutinas con Claude Opus (llamado desde el frontend del entrenador)
app.use("/api/ai", aiRoutes);
// Jobs: procesos en segundo plano y tareas programadas
app.use("/api/jobs", jobsRoutes);
// Webhooks: integraciones externas (pagos, etc.)
app.use("/api/webhooks", webhooksRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Ruta no encontrada" });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: "Error interno del servidor" });
});

// ─── Server start ─────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`🚀 HyenaHub infra server running on http://localhost:${PORT}`);
  console.log(`🌍 Frontend URL: ${FRONTEND_URL}`);
  console.log(`🔒 Rate limiting: 200 req/15min`);
  console.log(`🛡️  Helmet security headers active`);
});
