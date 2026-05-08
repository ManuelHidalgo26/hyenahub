import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  return proxyToBackend(req, `admin/users/${params.userId}`, "DELETE");
}
