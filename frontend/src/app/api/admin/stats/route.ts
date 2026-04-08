import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-auth";

// GET /api/admin/stats
export async function GET() {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const [totalUsers, totalTrainers, totalClients, totalRoutines, completedExercises] =
    await Promise.all([
      prisma.user.count(),
      prisma.trainer.count(),
      prisma.client.count(),
      prisma.routine.count(),
      prisma.exercise.count({ where: { completed: true } }),
    ]);

  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);

  const newUsersLast30 = await prisma.user.count({
    where: { createdAt: { gte: last30Days } },
  });

  return NextResponse.json({
    success: true,
    data: {
      totalUsers,
      totalTrainers,
      totalClients,
      totalRoutines,
      completedExercises,
      newUsersLast30,
    },
  });
}
