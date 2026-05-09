import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

export const dynamic = "force-dynamic";

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

const createSchema = z.object({
  clientId:      z.string(),
  weekStart:     z.string().datetime(),
  durationWeeks: z.number().int().min(0).max(52).optional(),
  notes:         z.string().optional(),
  exercises:     z.array(exerciseSchema).optional(),
  days:          z.array(daySchema).optional(),
}).refine(d => (d.exercises && d.exercises.length > 0) || (d.days && d.days.length > 0), {
  message: "Se requiere exercises o days",
});

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
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

  let routine;

  if (days && days.length > 0) {
    // Create routine with days and exercises in a transaction
    routine = await prisma.$transaction(async (tx) => {
      const r = await tx.routine.create({
        data: { clientId, weekStart: new Date(weekStart), durationWeeks: durationWeeks ?? 0, notes },
      });
      for (const [di, day] of days.entries()) {
        const d = await tx.routineDay.create({
          data: { routineId: r.id, name: day.name, order: day.order ?? di },
        });
        if (day.exercises.length > 0) {
          await tx.exercise.createMany({
            data: day.exercises.map((ex, ei) => ({
              routineId: r.id, dayId: d.id,
              name: ex.name, sets: ex.sets, reps: ex.reps,
              weight: ex.weight, notes: ex.notes, order: ex.order ?? ei,
            })),
          });
        }
      }
      return tx.routine.findUnique({
        where: { id: r.id },
        include: {
          days: { orderBy: { order: "asc" }, include: { exercises: { orderBy: { order: "asc" } } } },
          exercises: { orderBy: { order: "asc" } },
        },
      });
    });
  } else {
    routine = await prisma.routine.create({
      data: {
        clientId, weekStart: new Date(weekStart), durationWeeks: durationWeeks ?? 0, notes,
        exercises: {
          create: (exercises ?? []).map((ex, i) => ({
            name: ex.name, sets: ex.sets, reps: ex.reps,
            weight: ex.weight, notes: ex.notes, order: ex.order ?? i,
          })),
        },
      },
      include: {
        days: { orderBy: { order: "asc" }, include: { exercises: { orderBy: { order: "asc" } } } },
        exercises: { orderBy: { order: "asc" } },
      },
    });
  }

  // Notify client
  await pusherServer.trigger(`private-user-${client.userId}`, "routine:new", {
    routineId: routine!.id,
    message:   "Tu entrenador te asignó una nueva rutina 🏋️",
  }).catch(() => {});

  return NextResponse.json({ success: true, data: routine }, { status: 201 });
}
