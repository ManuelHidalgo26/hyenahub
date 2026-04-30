import "dotenv/config";
import http from "http";
import { createApp } from "./app";
import { initSocket } from "./socket";
import logger from "./services/logger.service";

const REQUIRED_ENV = ["DATABASE_URL", "JWT_SECRET"];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    logger.fatal({ env: key }, "Missing required environment variable");
    process.exit(1);
  }
}

const app = createApp();
const httpServer = http.createServer(app);
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const PORT = process.env.PORT || 4000;

initSocket(httpServer, FRONTEND_URL).then(() => {
  httpServer.listen(PORT, () => {
    logger.info({ port: PORT, frontendUrl: FRONTEND_URL }, "HyenaHub API started");
  });
});
