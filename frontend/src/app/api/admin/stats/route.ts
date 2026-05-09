import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";
import { requireRole } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { error } = await requireRole("ADMIN");
  if (error) return error;
  return proxyToBackend(req, "admin/stats");
}
