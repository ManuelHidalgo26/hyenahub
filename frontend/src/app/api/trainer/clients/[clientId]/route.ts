import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";
import { requireRole } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { clientId: string } }
) {
  const { error } = await requireRole("TRAINER");
  if (error) return error;
  return proxyToBackend(req, `trainer/clients/${params.clientId}`);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { clientId: string } }
) {
  const { error } = await requireRole("TRAINER");
  if (error) return error;
  return proxyToBackend(req, `trainer/clients/${params.clientId}`, "PATCH");
}
