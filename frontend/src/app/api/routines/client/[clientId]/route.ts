import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { clientId: string } }
) {
  return proxyToBackend(req, `routines/client/${params.clientId}`);
}
