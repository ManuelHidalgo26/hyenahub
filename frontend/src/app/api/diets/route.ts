import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

export const dynamic = "force-dynamic";

// GET — client fetches their own diets
export async function GET(req: NextRequest) {
  return proxyToBackend(req, "diets/my");
}

// POST — trainer creates a diet for a client
export async function POST(req: NextRequest) {
  return proxyToBackend(req, "diets", "POST");
}
