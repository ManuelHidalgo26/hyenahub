import { NextResponse } from "next/server";
import { requireRole } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function getMondayOfCurrentWeek(): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET() {
  const { session, error } = await requireRole("CLIENT");
  if (error) return error;

  const clientId = session!.user.profileId;
  const weekOf = getMondayOfCurrentWeek();

  const routine = await prisma.routine.findFirst({
    where: { clientId },
    orderBy: { weekStart: "desc" },
    include: {
      exercises: { orderBy: { order: "asc" } },
      days: { orderBy: { order: "asc" }, include: { exercises: { orderBy: { order: "asc" } } } },
    },
  });

  if (!routine) return NextResponse.json({ success: true, data: null });

  const logs = await prisma.exerciseLog.findMany({
    where: { clientId, weekOf },
    select: { exerciseId: true },
  });
  const completedIds = new Set(logs.map(l => l.exerciseId));

  const enriched = {
    ...routine,
    exercises: routine.exercises.map(ex => ({ ...ex, completedThisWeek: completedIds.has(ex.id) })),
    days: routine.days.map(d => ({
      ...d,
      exercises: d.exercises.map(ex => ({ ...ex, completedThisWeek: completedIds.has(ex.id) })),
    })),
  };

  return NextResponse.json({ success: true, data: enriched });
}
