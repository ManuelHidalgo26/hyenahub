import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-auth";
import { pusherServer } from "@/lib/pusher";

const exerciseSchema = z.object({
  name: z.string().min(1),
  sets: z.number().int().positive(),
  reps: z.number().int().positive(),
  weight: z.number().optional(),
  notes: z.string().optional(),
  order: z.number().int().optional(),
});

const createRoutineSchema = z.object({
  clientId: z.string(),
  weekStart: z.string().datetime(),
  durationWeeks: z.number().int().min(1).max(52).default(4),
  notes: z.string().optional(),
  exercises: z.array(exerciseSchema).min(1),
});

// POST /api/routines — trainer creates a routine for a client
export async function POST(req: NextRequest) {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = createRoutineSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { clientId, weekStart, durationWeeks, notes, exercises } = parsed.data;

    // Verify the client belongs to this trainer
    const client = await prisma.client.findFirst({
      where: { id: clientId, trainerId: session!.user.profileId },
    });

    if (!client) {
      return NextResponse.json(
        { success: false, error: "Cliente no encontrado" },
        { status: 403 }
      );
    }

    const routine = await prisma.routine.create({
      data: {
        clientId,
        weekStart: new Date(weekStart),
        durationWeeks,
        notes,
        exercises: {
          create: exercises.map((ex, i) => ({ ...ex, order: ex.order ?? i })),
        },
      },
      include: { exercises: { orderBy: { order: "asc" } } },
    });

    // Notify client in real time via Pusher
    await pusherServer.trigger(`private-user-${client.userId}`, "routine.new", {
      routineId: routine.id,
      message: "Tu entrenador te asignó una nueva rutina 🏋️",
    });

    return NextResponse.json({ success: true, data: routine }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/routines]", err);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
