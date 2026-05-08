import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { otherUserId: string } }
) {
  return proxyToBackend(req, `messages/${params.otherUserId}`);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { otherUserId: string } }
) {
  return proxyToBackend(req, `messages/${params.otherUserId}`, "POST");
}
