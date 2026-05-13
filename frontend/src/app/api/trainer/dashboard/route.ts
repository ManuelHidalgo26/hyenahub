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
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  const trainerId = session!.user.profileId;
  const weekOf = getMondayOfCurrentWeek();

  const clientIds = await prisma.client
    .findMany({ where: { trainerId }, select: { id: true } })
    .then(cs => cs.map(c => c.id));

  const [totalClients, thisWeekRoutines, completedExercisesThisWeek] = await Promise.all([
    Promise.resolve(clientIds.length),
    prisma.routine.count({ where: { weekStart: { gte: weekOf }, clientId: { in: clientIds } } }),
    prisma.exerciseLog.count({ where: { clientId: { in: clientIds }, weekOf } }),
  ]);

  return NextResponse.json({ success: true, data: { totalClients, thisWeekRoutines, completedExercisesThisWeek } });
}
