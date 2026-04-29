import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
    base: { service: "hyenahub-api" },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
    },
  },
  isDev
    ? pino.transport({
        target: "pino-pretty",
        options: { colorize: true, ignore: "pid,hostname,service" },
      })
    : undefined
);

export default logger;
