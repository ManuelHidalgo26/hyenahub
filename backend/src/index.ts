import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { initSocket } from "./socket";
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
    console.error(`❌  Missing required env variable: ${key}`);
    process.exit(1);
  }
}

const app = express();
const httpServer = http.createServer(app);

const PORT = process.env.PORT || 4000;

// Support comma-separated list of allowed origins, e.g. "https://hyenahub.app,http://localhost:3000"
const ALLOWED_ORIGINS: string[] = (
  process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || "http://localhost:3000"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// ─── Middlewares ─────────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
}));
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "3mb" })); // 3mb for base64 avatar images

// Rate limiter general — 200 req / 15 min por IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Demasiadas solicitudes. Intenta en 15 minutos." },
});

// Rate limiter estricto para auth — 20 req / 15 min por IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Demasiados intentos. Intenta en 15 minutos." },
});

app.use("/api", globalLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/auth",    authLimiter, authRoutes);
app.use("/api/trainer", trainerRoutes);
app.use("/api/routines", routineRoutes);
app.use("/api/admin",   adminRoutes);
app.use("/api/ai",      aiRoutes);
app.use("/api/videos",  videoRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/diets",    dietRoutes);
app.use("/api/feedback",   feedbackRoutes);
app.use("/api/templates",  templateRoutes);
app.use("/api/messages",   messageRoutes);

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

// ─── Socket.io + Server start ────────────────────────────────────────────────
initSocket(httpServer, ALLOWED_ORIGINS).then(() => {
  httpServer.listen(PORT, () => {
    console.log(`🚀 HyenaHub API running on http://localhost:${PORT}`);
    console.log(`🌍 Allowed origins: ${ALLOWED_ORIGINS.join(", ")}`);
    console.log(`📡 Socket.io ready`);
    console.log(`🔒 Rate limiting: global 200/15min, auth 20/15min`);
    console.log(`🛡️  Helmet security headers active`);
  });
});
