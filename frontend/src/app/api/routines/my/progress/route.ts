import { NextResponse } from "next/server";
import { requireRole } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, error } = await requireRole("CLIENT");
  if (error) return error;

  const routines = await prisma.routine.findMany({
    where: { clientId: session!.user.profileId },
    orderBy: { weekStart: "asc" },
    take: 12,
    include: { exercises: { select: { completed: true } } },
  });

  const data = routines.map(r => {
    const total = r.exercises.length;
    const done  = r.exercises.filter(e => e.completed).length;
    return {
      weekStart: r.weekStart.toISOString().split("T")[0],
      total,
      done,
      pct: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  });

  return NextResponse.json({ success: true, data });
}
