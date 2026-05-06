import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function buildDatasourceUrl(): string {
  const url = process.env.DATABASE_URL ?? "";
  if (!url) return url;
  // Supabase Transaction pooler (port 6543) requires pgbouncer=true to disable
  // prepared statements. Append automatically so the env var stays clean.
  if (url.includes("pooler.supabase.com") && !url.includes("pgbouncer=true")) {
    return url.includes("?") ? `${url}&pgbouncer=true` : `${url}?pgbouncer=true`;
  }
  return url;
}

if (process.env.NODE_ENV === "production") {
  const url = process.env.DATABASE_URL ?? "";
  const usernameMatch = url.match(/\/\/([^:]+):/);
  const hostMatch = url.match(/@([^/?]+)/);
  console.log("[prisma] username:", usernameMatch?.[1] ?? "NOT SET");
  console.log("[prisma] host:", hostMatch?.[1] ?? "NOT SET");
}

const prisma = global.prisma ?? new PrismaClient({ datasourceUrl: buildDatasourceUrl() });

if (process.env.NODE_ENV !== "production") global.prisma = prisma;

export { prisma };
