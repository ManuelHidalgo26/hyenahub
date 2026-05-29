import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { getMondayOfCurrentWeek } from "@/lib/date-utils";

export const dynamic = "force-dynamic";

export async function PATCH(_req: NextRequest, { params }: { params: { exerciseId: string } }) {
  const { session, error } = await requireRole("CLIENT");
  if (error) return error;

  const clientId = session!.user.profileId;
  if (!clientId) {
    return NextResponse.json(
      { success: false, error: "Sesión inválida. Por favor, volvé a iniciar sesión." },
      { status: 401 }
    );
  }

  const exercise = await prisma.exercise.findUnique({
    where: { id: params.exerciseId },
    include: { routine: { include: { client: { include: { trainer: true } } } } },
  });
  if (!exercise) {
    return NextResponse.json({ success: false, error: "Ejercicio no encontrado" }, { status: 404 });
  }
  if (exercise.routine.clientId !== clientId) {
    return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 });
  }

  const weekOf = getMondayOfCurrentWeek();

  const existing = await prisma.exerciseLog.findUnique({
    where: { exerciseId_clientId_weekOf: { exerciseId: exercise.id, clientId, weekOf } },
  });

  let completedThisWeek: boolean;
  if (existing) {
    await prisma.exerciseLog.delete({ where: { id: existing.id } });
    completedThisWeek = false;
  } else {
    await prisma.exerciseLog.create({ data: { exerciseId: exercise.id, clientId, weekOf } });
    completedThisWeek = true;
  }

  // Verificar si todos los ejercicios de la rutina están completos esta semana
  const allExercises = await prisma.exercise.findMany({
    where: { routineId: exercise.routineId },
    select: { id: true },
  });
  const allExerciseIds = allExercises.map(e => e.id);
  const weekLogs = await prisma.exerciseLog.findMany({
    where: { clientId, weekOf, exerciseId: { in: allExerciseIds } },
    select: { exerciseId: true },
  });
  const loggedIds = new Set(weekLogs.map(l => l.exerciseId));
  const sessionComplete = allExerciseIds.every(id => loggedIds.has(id));

  // Notify the trainer on their User channel (private-user-<userId>), not the Trainer.id
  const trainerUserId = exercise.routine.client.trainer.userId;

  await pusherServer.trigger(
    `private-user-${trainerUserId}`,
    "exercise:completed",
    { exerciseId: exercise.id, exerciseName: exercise.name, routineId: exercise.routineId, clientId, completed: completedThisWeek }
  ).catch(() => {});

  if (sessionComplete) {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: { user: { select: { name: true } } },
    });
    await pusherServer.trigger(
      `private-user-${trainerUserId}`,
      "session:completed",
      { clientId, clientName: client?.user.name, routineId: exercise.routineId, message: `${client?.user.name} completó su sesión de hoy 💪` }
    ).catch(() => {});
  }

  return NextResponse.json({ success: true, data: { id: exercise.id, completedThisWeek } });
}
