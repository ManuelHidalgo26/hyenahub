import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { clientId: string } }
) {
  return proxyToBackend(req, `trainer/clients/${params.clientId}/reset-password`, "POST");
}
