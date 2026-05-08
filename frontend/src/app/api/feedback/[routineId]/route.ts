import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { routineId: string } }
) {
  return proxyToBackend(req, `feedback/${params.routineId}`, "POST");
}
