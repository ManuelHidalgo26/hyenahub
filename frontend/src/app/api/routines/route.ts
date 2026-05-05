import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-auth";
import { pusherServer } from "@/lib/pusher";

const exerciseSchema = z.object({
  name:   z.string().min(1),
  sets:   z.number().int().positive(),
  reps:   z.number().int().positive(),
  weight: z.number().optional(),
  notes:  z.string().optional(),
  order:  z.number().int().optional(),
});

const daySchema = z.object({
  name:      z.string().min(1),
  order:     z.number().int().optional(),
  exercises: z.array(exerciseSchema).min(1),
});

const createRoutineSchema = z.object({
  clientId:      z.string(),
  weekStart:     z.string().datetime(),
  durationWeeks: z.number().int().min(0).max(52).default(0),
  notes:         z.string().optional(),
  exercises:     z.array(exerciseSchema).optional(),
  days:          z.array(daySchema).optional(),
}).refine(d => (d.exercises && d.exercises.length > 0) || (d.days && d.days.length > 0), {
  message: "Se requiere exercises o days",
});

const routineInclude = {
  days: {
    orderBy: { order: "asc" as const },
    include: { exercises: { orderBy: { order: "asc" as const } } },
  },
  exercises: {
    where:   { dayId: null as null },
    orderBy: { order: "asc" as const },
  },
};

// POST /api/routines — trainer creates a routine for a client
export async function POST(req: NextRequest) {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  try {
    const body   = await req.json();
    const parsed = createRoutineSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const { clientId, weekStart, durationWeeks, notes, exercises, days } = parsed.data;

    const client = await prisma.client.findFirst({
      where: { id: clientId, trainerId: session!.user.profileId },
    });
    if (!client) {
      return NextResponse.json({ success: false, error: "Cliente no encontrado" }, { status: 403 });
    }

    // Create the routine first (no exercises yet)
    const routine = await prisma.routine.create({
      data: { clientId, weekStart: new Date(weekStart), durationWeeks, notes },
    });

    if (days && days.length > 0) {
      // Create days + their exercises
      for (const [di, d] of days.entries()) {
        const day = await prisma.routineDay.create({
          data: { routineId: routine.id, name: d.name, order: d.order ?? di },
        });
        await prisma.exercise.createMany({
          data: d.exercises.map((ex, ei) => ({
            routineId: routine.id,
            dayId:     day.id,
            name:      ex.name,
            sets:      ex.sets,
            reps:      ex.reps,
            weight:    ex.weight   ?? null,
            notes:     ex.notes    ?? null,
            order:     ex.order    ?? ei,
          })),
        });
      }
    } else if (exercises && exercises.length > 0) {
      await prisma.exercise.createMany({
        data: exercises.map((ex, i) => ({
          routineId: routine.id,
          name:      ex.name,
          sets:      ex.sets,
          reps:      ex.reps,
          weight:    ex.weight ?? null,
          notes:     ex.notes  ?? null,
          order:     ex.order  ?? i,
        })),
      });
    }

    const full = await prisma.routine.findUnique({
      where:   { id: routine.id },
      include: routineInclude,
    });

    await pusherServer.trigger(`private-user-${client.userId}`, "routine.new", {
      routineId: routine.id,
      message:   "Tu entrenador te asignó una nueva rutina 🏋️",
    });

    return NextResponse.json({ success: true, data: full }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/routines]", err);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}
