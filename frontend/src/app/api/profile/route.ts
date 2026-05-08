import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return proxyToBackend(req, "profile/me");
}

export async function PATCH(req: NextRequest) {
  return proxyToBackend(req, "profile/avatar", "PATCH");
}
