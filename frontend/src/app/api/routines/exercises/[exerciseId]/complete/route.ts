import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { exerciseId: string } }
) {
  return proxyToBackend(req, `routines/exercises/${params.exerciseId}/complete`, "PATCH");
}
