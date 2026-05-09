import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

export const dynamic = "force-dynamic";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: { exerciseId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "CLIENT") {
    return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 });
  }

  const exercise = await prisma.exercise.findUnique({
    where:   { id: params.exerciseId },
    include: { routine: { include: { client: { include: { trainer: { include: { user: true } } } } } } },
  });

  if (!exercise) return NextResponse.json({ success: false, error: "Ejercicio no encontrado" }, { status: 404 });
  if (exercise.routine.clientId !== session.user.profileId) {
    return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 });
  }

  const updated = await prisma.exercise.update({
    where: { id: exercise.id },
    data:  { completed: !exercise.completed },
  });

  const trainerUserId = exercise.routine.client.trainer.userId;

  await pusherServer.trigger(`private-user-${trainerUserId}`, "exercise.completed", {
    exerciseId:   updated.id,
    exerciseName: updated.name,
    routineId:    exercise.routineId,
    clientId:     exercise.routine.clientId,
    completed:    updated.completed,
  }).catch(() => {});

  const allExercises = await prisma.exercise.findMany({ where: { routineId: exercise.routineId } });
  const sessionComplete = allExercises.every(ex => ex.id === updated.id ? updated.completed : ex.completed);

  if (sessionComplete) {
    const clientUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } });
    await pusherServer.trigger(`private-user-${trainerUserId}`, "session.completed", {
      clientId:   session.user.profileId,
      clientName: clientUser?.name,
      routineId:  exercise.routineId,
      message:    `${clientUser?.name} completó su sesión de hoy 💪`,
    }).catch(() => {});
  }

  return NextResponse.json({ success: true, data: updated });
}
