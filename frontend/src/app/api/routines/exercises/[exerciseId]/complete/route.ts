import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

export const dynamic = "force-dynamic";

export async function PATCH(_req: NextRequest, { params }: { params: { exerciseId: string } }) {
  const { session, error } = await requireRole("CLIENT");
  if (error) return error;

  const exercise = await prisma.exercise.findUnique({
    where: { id: params.exerciseId },
    include: { routine: { include: { client: true } } },
  });
  if (!exercise) {
    return NextResponse.json({ success: false, error: "Ejercicio no encontrado" }, { status: 404 });
  }
  if (exercise.routine.clientId !== session!.user.profileId) {
    return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 });
  }

  const updated = await prisma.exercise.update({
    where: { id: exercise.id },
    data: { completed: !exercise.completed },
  });

  // Notify trainer
  await pusherServer.trigger(`private-user-${exercise.routine.client.trainerId}`, "exercise:completed", {
    exerciseId: updated.id, exerciseName: updated.name,
    routineId: exercise.routineId, clientId: exercise.routine.clientId, completed: updated.completed,
  }).catch(() => {});

  // Check if all exercises completed
  const allExercises = await prisma.exercise.findMany({ where: { routineId: exercise.routineId } });
  const sessionComplete = allExercises.every(ex => ex.id === updated.id ? updated.completed : ex.completed);

  if (sessionComplete) {
    const client = await prisma.client.findUnique({
      where: { id: exercise.routine.clientId },
      include: { user: { select: { name: true } } },
    });
    await pusherServer.trigger(`private-user-${exercise.routine.client.trainerId}`, "session:completed", {
      clientId: exercise.routine.clientId,
      clientName: client?.user.name,
      routineId: exercise.routineId,
      message: `${client?.user.name} completó su sesión de hoy 💪`,
    }).catch(() => {});
  }

  return NextResponse.json({ success: true, data: updated });
}
