import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: { dietId: string } }
) {
  return proxyToBackend(req, `diets/${params.dietId}`, "PUT");
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { dietId: string } }
) {
  return proxyToBackend(req, `diets/${params.dietId}`, "DELETE");
}
