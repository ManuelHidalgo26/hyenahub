import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { clientId: string } }
) {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  const client = await prisma.client.findFirst({
    where: { id: params.clientId, trainerId: session!.user.profileId },
  });
  if (!client) {
    return NextResponse.json({ success: false, error: "Cliente no encontrado" }, { status: 403 });
  }

  const diets = await prisma.diet.findMany({
    where: { clientId: params.clientId },
    include: { meals: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: diets });
}
