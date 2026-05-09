import { NextResponse } from "next/server";
import { requireRole } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, error } = await requireRole("CLIENT");
  if (error) return error;

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const routine = await prisma.routine.findFirst({
    where: { clientId: session!.user.profileId, weekStart: { gte: weekStart } },
    orderBy: { weekStart: "desc" },
    include: {
      exercises: { orderBy: { order: "asc" } },
      days: { orderBy: { order: "asc" }, include: { exercises: { orderBy: { order: "asc" } } } },
    },
  });

  return NextResponse.json({ success: true, data: routine ?? null });
}
