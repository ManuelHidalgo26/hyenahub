import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  weekStart:     z.string().datetime().optional(),
  durationWeeks: z.number().int().min(0).max(52).optional(),
  notes:         z.string().optional(),
  exercises: z.array(z.object({
    name:   z.string().min(1),
    sets:   z.number().int().positive(),
    reps:   z.number().int().positive(),
    weight: z.number().optional(),
    notes:  z.string().optional(),
    order:  z.number().int().optional(),
  })).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { routineId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TRAINER") {
    return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 });
  }

  const routine = await prisma.routine.findFirst({
    where: { id: params.routineId, client: { trainerId: session.user.profileId } },
  });
  if (!routine) return NextResponse.json({ success: false, error: "Rutina no encontrada" }, { status: 404 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });

  const { weekStart, durationWeeks, notes, exercises } = parsed.data;

  if (exercises && exercises.length > 0) {
    await prisma.exercise.deleteMany({ where: { routineId: routine.id } });
  }

  const updated = await prisma.routine.update({
    where: { id: routine.id },
    data: {
      ...(weekStart     !== undefined && { weekStart: new Date(weekStart) }),
      ...(durationWeeks !== undefined && { durationWeeks }),
      ...(notes         !== undefined && { notes }),
      ...(exercises && exercises.length > 0 && {
        exercises: { create: exercises.map((ex, i) => ({ ...ex, order: ex.order ?? i })) },
      }),
    },
    include: { exercises: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { routineId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TRAINER") {
    return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 });
  }

  const routine = await prisma.routine.findFirst({
    where: { id: params.routineId, client: { trainerId: session.user.profileId } },
  });
  if (!routine) return NextResponse.json({ success: false, error: "Rutina no encontrada" }, { status: 404 });

  await prisma.routine.delete({ where: { id: routine.id } });
  console.log(JSON.stringify({ action: "ROUTINE_DELETED", actorId: session.user.id, targetId: routine.id, ts: new Date() }));

  return NextResponse.json({ success: true, message: "Rutina eliminada" });
}
