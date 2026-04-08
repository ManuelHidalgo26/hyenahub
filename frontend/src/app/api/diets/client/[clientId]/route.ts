import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-auth";

// GET /api/diets/client/[clientId] — trainer gets all diets for a specific client
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  const { clientId } = await params;

  const client = await prisma.client.findFirst({
    where: { id: clientId, trainerId: session!.user.profileId },
  });
  if (!client) {
    return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 });
  }

  const diets = await prisma.diet.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    include: { meals: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ success: true, data: diets });
}
