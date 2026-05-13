import { NextResponse } from "next/server";
import { requireRole } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);

  const [totalUsers, totalTrainers, totalClients, totalRoutines, completedExercises, newUsersLast30] =
    await Promise.all([
      prisma.user.count(),
      prisma.trainer.count(),
      prisma.client.count(),
      prisma.routine.count(),
      prisma.exerciseLog.count(),
      prisma.user.count({ where: { createdAt: { gte: last30Days } } }),
    ]);

  return NextResponse.json({
    success: true,
    data: { totalUsers, totalTrainers, totalClients, totalRoutines, completedExercises, newUsersLast30 },
  });
}
