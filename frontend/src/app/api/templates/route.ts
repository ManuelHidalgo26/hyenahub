import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return proxyToBackend(req, "templates");
}

export async function POST(req: NextRequest) {
  return proxyToBackend(req, "templates", "POST");
}
