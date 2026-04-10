import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prisma =
  global.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        // connect_timeout=15 gives Neon time to wake from cold start on Vercel serverless
        url: process.env.DATABASE_URL + (process.env.DATABASE_URL?.includes("?") ? "&" : "?") + "connect_timeout=15",
      },
    },
  });

if (process.env.NODE_ENV !== "production") global.prisma = prisma;

export { prisma };
