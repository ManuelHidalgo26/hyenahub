import { NextResponse } from "next/server";
import { requireRole } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  const trainerId = session!.user.profileId;

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const [totalClients, thisWeekRoutines, completedExercisesThisWeek] = await Promise.all([
    prisma.client.count({ where: { trainerId } }),
    prisma.routine.count({ where: { weekStart: { gte: weekStart }, client: { trainerId } } }),
    prisma.exercise.count({
      where: { completed: true, routine: { weekStart: { gte: weekStart }, client: { trainerId } } },
    }),
  ]);

  return NextResponse.json({ success: true, data: { totalClients, thisWeekRoutines, completedExercisesThisWeek } });
}
