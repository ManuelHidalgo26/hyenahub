import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { templateId: string } }
) {
  return proxyToBackend(req, `templates/${params.templateId}`, "PATCH");
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { templateId: string } }
) {
  return proxyToBackend(req, `templates/${params.templateId}`, "DELETE");
}
