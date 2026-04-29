import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { initSocket } from "./socket";
import logger from "./services/logger.service";
import authRoutes    from "./routes/auth.routes";
import trainerRoutes from "./routes/trainer.routes";
import routineRoutes from "./routes/routine.routes";
import adminRoutes   from "./routes/admin.routes";
import aiRoutes      from "./routes/ai.routes";
import videoRoutes   from "./routes/video.routes";
import profileRoutes from "./routes/profile.routes";
import dietRoutes     from "./routes/diet.routes";
import feedbackRoutes  from "./routes/feedback.routes";
import templateRoutes  from "./routes/template.routes";
import messageRoutes   from "./routes/message.routes";

// ─── Startup validation ──────────────────────────────────────────────────────
const REQUIRED_ENV = ["DATABASE_URL", "JWT_SECRET"];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    logger.fatal({ env: key }, "Missing required environment variable");
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
app.use(express.json({ limit: "3mb" }));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Demasiadas solicitudes. Intenta en 15 minutos." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Demasiados intentos. Intenta en 15 minutos." },
});

app.use("/api", globalLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/auth",      authLimiter, authRoutes);
app.use("/api/trainer",   trainerRoutes);
app.use("/api/routines",  routineRoutes);
app.use("/api/admin",     adminRoutes);
app.use("/api/ai",        aiRoutes);
app.use("/api/videos",    videoRoutes);
app.use("/api/profile",   profileRoutes);
app.use("/api/diets",     dietRoutes);
app.use("/api/feedback",  feedbackRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/messages",  messageRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Ruta no encontrada" });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ success: false, error: "Error interno del servidor" });
});

// ─── Socket.io + Server start ────────────────────────────────────────────────
initSocket(httpServer, FRONTEND_URL).then(() => {
  httpServer.listen(PORT, () => {
    logger.info(
      { port: PORT, frontendUrl: FRONTEND_URL },
      "HyenaHub API started"
    );
  });
});
