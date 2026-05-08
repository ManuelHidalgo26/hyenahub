import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { routineId: string } }
) {
  return proxyToBackend(req, `routines/${params.routineId}`, "PATCH");
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { routineId: string } }
) {
  return proxyToBackend(req, `routines/${params.routineId}`, "DELETE");
}
