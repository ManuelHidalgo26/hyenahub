import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "CLIENT") {
    return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 });
  }

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const routine = await prisma.routine.findFirst({
    where:   { clientId: session.user.profileId, weekStart: { gte: weekStart } },
    orderBy: { weekStart: "desc" },
    include: { exercises: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ success: true, data: routine ?? null });
}
