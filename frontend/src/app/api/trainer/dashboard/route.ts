import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-auth";

// GET /api/trainer/dashboard — aggregate stats for the authenticated trainer
export async function GET() {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  try {
    const trainerId = session!.user.profileId;

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
    weekStart.setHours(0, 0, 0, 0);

    const [totalClients, thisWeekRoutines, completedExercisesThisWeek] =
      await Promise.all([
        prisma.client.count({ where: { trainerId } }),
        prisma.routine.count({
          where: {
            weekStart: { gte: weekStart },
            client: { trainerId },
          },
        }),
        prisma.exercise.count({
          where: {
            completed: true,
            routine: {
              weekStart: { gte: weekStart },
              client: { trainerId },
            },
          },
        }),
      ]);

    return NextResponse.json({
      success: true,
      data: { totalClients, thisWeekRoutines, completedExercisesThisWeek },
    });
  } catch (err) {
    console.error("[GET /api/trainer/dashboard]", err);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
