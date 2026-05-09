import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

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

const patchSchema = z.object({
  weekStart:     z.string().datetime().optional(),
  durationWeeks: z.number().int().min(0).max(52).optional(),
  notes:         z.string().optional(),
  exercises:     z.array(exerciseSchema).optional(),
  days:          z.array(daySchema).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { routineId: string } }) {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const routine = await prisma.routine.findFirst({
    where: { id: params.routineId, client: { trainerId: session!.user.profileId } },
  });
  if (!routine) {
    return NextResponse.json({ success: false, error: "Rutina no encontrada" }, { status: 404 });
  }

  const { weekStart, durationWeeks, notes, exercises, days } = parsed.data;
  const hasDays = days && days.length > 0;
  const hasExercises = exercises && exercises.length > 0;

  if (hasDays || hasExercises) {
    await prisma.exercise.deleteMany({ where: { routineId: routine.id } });
    await prisma.routineDay.deleteMany({ where: { routineId: routine.id } });
  }

  let updated;
  if (hasDays) {
    updated = await prisma.$transaction(async (tx) => {
      const r = await tx.routine.update({
        where: { id: routine.id },
        data: {
          ...(weekStart     !== undefined && { weekStart: new Date(weekStart) }),
          ...(durationWeeks !== undefined && { durationWeeks }),
          ...(notes         !== undefined && { notes }),
        },
      });
      for (const [di, day] of days!.entries()) {
        const d = await tx.routineDay.create({
          data: { routineId: r.id, name: day.name, order: day.order ?? di },
        });
        await tx.exercise.createMany({
          data: day.exercises.map((ex, ei) => ({
            routineId: r.id, dayId: d.id,
            name: ex.name, sets: ex.sets, reps: ex.reps,
            weight: ex.weight, notes: ex.notes, order: ex.order ?? ei,
          })),
        });
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
    updated = await prisma.routine.update({
      where: { id: routine.id },
      data: {
        ...(weekStart     !== undefined && { weekStart: new Date(weekStart) }),
        ...(durationWeeks !== undefined && { durationWeeks }),
        ...(notes         !== undefined && { notes }),
        ...(hasExercises && {
          exercises: {
            create: exercises!.map((ex, i) => ({
              name: ex.name, sets: ex.sets, reps: ex.reps,
              weight: ex.weight, notes: ex.notes, order: ex.order ?? i,
            })),
          },
        }),
      },
      include: {
        days: { orderBy: { order: "asc" }, include: { exercises: { orderBy: { order: "asc" } } } },
        exercises: { orderBy: { order: "asc" } },
      },
    });
  }

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: { routineId: string } }) {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  const routine = await prisma.routine.findFirst({
    where: { id: params.routineId, client: { trainerId: session!.user.profileId } },
  });
  if (!routine) {
    return NextResponse.json({ success: false, error: "Rutina no encontrada" }, { status: 404 });
  }

  await prisma.routine.delete({ where: { id: routine.id } });
  return NextResponse.json({ success: true, message: "Rutina eliminada" });
}
