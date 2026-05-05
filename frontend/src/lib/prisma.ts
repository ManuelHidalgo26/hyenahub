import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Log DB host on startup so we can verify the right DB is being used
const dbUrl = process.env.DATABASE_URL ?? "";
const dbHost = dbUrl.replace(/\/\/[^@]+@/, "//***@").split("?")[0];
if (process.env.NODE_ENV === "production") {
  console.log("[prisma] connecting to:", dbHost || "DATABASE_URL not set");
}

const prisma = global.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") global.prisma = prisma;

export { prisma };
