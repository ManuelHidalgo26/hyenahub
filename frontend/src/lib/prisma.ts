import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function buildDatasourceUrl(): string {
  const url = process.env.DATABASE_URL ?? "";
  // Supabase Transaction mode pooler requires pgbouncer=true to disable
  // prepared statements. Append it if not already present.
  if (url && !url.includes("pgbouncer=true")) {
    return url.includes("?") ? `${url}&pgbouncer=true` : `${url}?pgbouncer=true`;
  }
  return url;
}

const datasourceUrl = buildDatasourceUrl();

if (process.env.NODE_ENV === "production") {
  const dbHost = datasourceUrl.replace(/\/\/[^:]+:[^@]+@/, "//***:***@");
  const usernameMatch = datasourceUrl.match(/\/\/([^:]+):/);
  console.log("[prisma] connecting to:", dbHost || "DATABASE_URL not set");
  console.log("[prisma] username:", usernameMatch?.[1] ?? "unknown");
}

const prisma = global.prisma ?? new PrismaClient({ datasourceUrl });

if (process.env.NODE_ENV !== "production") global.prisma = prisma;

export { prisma };
