import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-auth";

const exerciseSchema = z.object({
  name:   z.string().min(1),
  sets:   z.number().int().positive(),
  reps:   z.number().int().positive(),
  weight: z.number().positive().optional(),
  notes:  z.string().optional(),
  order:  z.number().int(),
});

const daySchema = z.object({
  name:      z.string().min(1),
  order:     z.number().int().optional(),
  exercises: z.array(exerciseSchema).min(1),
});

const patchSchema = z.object({
  notes:         z.string().optional(),
  weekStart:     z.string().optional(),
  durationWeeks: z.number().int().min(0).max(52).optional(),
  exercises:     z.array(exerciseSchema).optional(),
  days:          z.array(daySchema).optional(),
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
  feedback: true,
};

// PATCH /api/routines/[routineId] — trainer edits a routine
export async function PATCH(
  req: NextRequest,
  { params }: { params: { routineId: string } }
) {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  try {
    const body   = await req.json();
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

    const { notes, weekStart, durationWeeks, exercises, days } = parsed.data;

    // Delete all existing days (cascade deletes their exercises) and ungrouped exercises
    await prisma.routineDay.deleteMany({ where: { routineId: routine.id } });
    await prisma.exercise.deleteMany({ where: { routineId: routine.id, dayId: null } });

    // Update routine metadata
    await prisma.routine.update({
      where: { id: routine.id },
      data: {
        ...(notes         !== undefined && { notes }),
        ...(weekStart     !== undefined && { weekStart: new Date(weekStart) }),
        ...(durationWeeks !== undefined && { durationWeeks }),
      },
    });

    if (days && days.length > 0) {
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
            weight:    ex.weight ?? null,
            notes:     ex.notes  ?? null,
            order:     ex.order  ?? ei,
          })),
        });
      }
    } else if (exercises && exercises.length > 0) {
      await prisma.exercise.createMany({
        data: exercises.map(ex => ({
          routineId: routine.id,
          name:      ex.name,
          sets:      ex.sets,
          reps:      ex.reps,
          weight:    ex.weight ?? null,
          notes:     ex.notes  ?? null,
          order:     ex.order,
        })),
      });
    }

    const updated = await prisma.routine.findUnique({
      where:   { id: routine.id },
      include: routineInclude,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("[PATCH /api/routines/[routineId]]", err);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}

// DELETE /api/routines/[routineId] — trainer deletes a routine
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { routineId: string } }
) {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  try {
    const routine = await prisma.routine.findFirst({
      where: { id: params.routineId, client: { trainerId: session!.user.profileId } },
    });
    if (!routine) {
      return NextResponse.json({ success: false, error: "Rutina no encontrada" }, { status: 404 });
    }

    await prisma.routine.delete({ where: { id: routine.id } });
    return NextResponse.json({ success: true, message: "Rutina eliminada" });
  } catch (err) {
    console.error("[DELETE /api/routines/[routineId]]", err);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}
