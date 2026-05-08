import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { videoId: string } }
) {
  return proxyToBackend(req, `videos/${params.videoId}`, "DELETE");
}
