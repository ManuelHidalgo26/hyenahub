import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { clientId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TRAINER") {
    return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 });
  }

  const client = await prisma.client.findFirst({
    where: { id: params.clientId, trainerId: session.user.profileId },
  });
  if (!client) return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 });

  const routines = await prisma.routine.findMany({
    where:   { clientId: params.clientId },
    orderBy: { weekStart: "desc" },
    include: { exercises: { orderBy: { order: "asc" } }, feedback: true },
  });

  return NextResponse.json({ success: true, data: routines });
}
