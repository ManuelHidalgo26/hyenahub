import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

if (process.env.NODE_ENV === "production") {
  const url = process.env.DATABASE_URL ?? "";
  const usernameMatch = url.match(/\/\/([^:]+):/);
  const hostMatch = url.match(/@([^/]+)/);
  console.log("[prisma] username:", usernameMatch?.[1] ?? "unknown");
  console.log("[prisma] host:", hostMatch?.[1] ?? "unknown");
}

const prisma = global.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") global.prisma = prisma;

export { prisma };
