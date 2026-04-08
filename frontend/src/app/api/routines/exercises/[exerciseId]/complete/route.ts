import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-auth";
import { pusherServer } from "@/lib/pusher";

// PATCH /api/routines/exercises/[exerciseId]/complete — client toggles exercise done
export async function PATCH(
  _req: NextRequest,
  { params }: { params: { exerciseId: string } }
) {
  const { session, error } = await requireRole("CLIENT");
  if (error) return error;

  try {
    const exercise = await prisma.exercise.findUnique({
      where: { id: params.exerciseId },
      include: {
        routine: {
          include: { client: true },
        },
      },
    });

    if (!exercise) {
      return NextResponse.json(
        { success: false, error: "Ejercicio no encontrado" },
        { status: 404 }
      );
    }

    // Verify this exercise belongs to the requesting client
    if (exercise.routine.clientId !== session!.user.profileId) {
      return NextResponse.json(
        { success: false, error: "Acceso denegado" },
        { status: 403 }
      );
    }

    const updated = await prisma.exercise.update({
      where: { id: exercise.id },
      data: { completed: !exercise.completed },
    });

    const trainerId = exercise.routine.client.trainerId;

    // Notify trainer in real time
    await pusherServer.trigger(
      `private-user-${trainerId}`,
      "exercise.completed",
      {
        exerciseId: updated.id,
        exerciseName: updated.name,
        routineId: exercise.routineId,
        clientId: exercise.routine.clientId,
        completed: updated.completed,
      }
    );

    // Check if all exercises in routine are completed
    const allExercises = await prisma.exercise.findMany({
      where: { routineId: exercise.routineId },
    });

    const sessionComplete = allExercises.every((ex) =>
      ex.id === updated.id ? updated.completed : ex.completed
    );

    if (sessionComplete) {
      const client = await prisma.client.findUnique({
        where: { id: exercise.routine.clientId },
        include: { user: { select: { name: true } } },
      });

      const clientName = client?.user.name ?? "El cliente";

      await pusherServer.trigger(
        `private-user-${trainerId}`,
        "session.completed",
        {
          clientId: exercise.routine.clientId,
          clientName,
          routineId: exercise.routineId,
          message: `${clientName} completó su sesión 💪`,
        }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("[PATCH /api/routines/exercises/[exerciseId]/complete]", err);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
