import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function buildDatasourceUrl(): string {
  const url = process.env.DATABASE_URL ?? "";
  if (!url) return url;
  const addParam = (base: string, param: string) =>
    base.includes("?") ? `${base}&${param}` : `${base}?${param}`;
  // Pooler Transaction mode (port 6543) needs pgbouncer=true
  if (url.includes("pooler.supabase.com") && url.includes(":6543")) {
    return url.includes("pgbouncer=true") ? url : addParam(url, "pgbouncer=true");
  }
  // Direct or Session mode: limit connections for serverless
  if (!url.includes("connection_limit")) {
    return addParam(url, "connection_limit=1&pool_timeout=2");
  }
  return url;
}


const prisma = global.prisma ?? new PrismaClient({ datasourceUrl: buildDatasourceUrl() });

if (process.env.NODE_ENV !== "production") global.prisma = prisma;

export { prisma };
