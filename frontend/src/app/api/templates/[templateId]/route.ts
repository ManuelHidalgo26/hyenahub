import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { exerciseSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name:          z.string().min(1).optional(),
  description:   z.string().optional(),
  durationWeeks: z.number().int().min(0).max(52).optional(),
  exercises:     z.array(exerciseSchema).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { templateId: string } }
) {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  const template = await prisma.routineTemplate.findFirst({
    where: { id: params.templateId, trainerId: session!.user.profileId },
  });
  if (!template) {
    return NextResponse.json({ success: false, error: "Plantilla no encontrada" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const { exercises, ...rest } = parsed.data;

  const updated = await prisma.$transaction(async (tx) => {
    if (exercises !== undefined) {
      await tx.routineTemplateExercise.deleteMany({ where: { templateId: params.templateId } });
      if (exercises.length > 0) {
        await tx.routineTemplateExercise.createMany({
          data: exercises.map((ex, i) => ({
            templateId: params.templateId,
            name: ex.name, sets: ex.sets, reps: ex.reps,
            weight: ex.weight, notes: ex.notes, order: ex.order ?? i,
          })),
        });
      }
    }
    return tx.routineTemplate.update({
      where: { id: params.templateId },
      data: rest,
      include: { exercises: { orderBy: { order: "asc" } } },
    });
  });

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { templateId: string } }
) {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  const template = await prisma.routineTemplate.findFirst({
    where: { id: params.templateId, trainerId: session!.user.profileId },
  });
  if (!template) {
    return NextResponse.json({ success: false, error: "Plantilla no encontrada" }, { status: 404 });
  }

  await prisma.routineTemplate.delete({ where: { id: params.templateId } });

  return NextResponse.json({ success: true });
}
