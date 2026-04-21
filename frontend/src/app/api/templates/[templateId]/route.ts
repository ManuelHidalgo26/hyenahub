import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-auth";

const exerciseSchema = z.object({
  name:   z.string().min(1),
  sets:   z.number().int().positive(),
  reps:   z.number().int().positive(),
  weight: z.number().optional(),
  notes:  z.string().optional(),
  order:  z.number().int().optional(),
});

const patchSchema = z.object({
  name:          z.string().min(1).max(80).optional(),
  description:   z.string().max(300).optional(),
  durationWeeks: z.number().int().min(0).max(52).optional(),
  exercises:     z.array(exerciseSchema).min(1),
});

// PATCH /api/templates/[templateId] — trainer edits a template
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  const { templateId } = await params;

  const tmpl = await prisma.routineTemplate.findFirst({
    where: { id: templateId, trainerId: session!.user.profileId },
  });
  if (!tmpl) {
    return NextResponse.json({ success: false, error: "Template no encontrado" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, description, durationWeeks, exercises } = parsed.data;

  // Delete existing exercises and recreate
  await prisma.routineTemplateExercise.deleteMany({ where: { templateId } });

  const updated = await prisma.routineTemplate.update({
    where: { id: templateId },
    data: {
      ...(name          !== undefined && { name }),
      ...(description   !== undefined && { description }),
      ...(durationWeeks !== undefined && { durationWeeks }),
      exercises: {
        create: exercises.map((ex, i) => ({ ...ex, order: ex.order ?? i })),
      },
    },
    include: { exercises: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ success: true, data: updated });
}

// DELETE /api/templates/[templateId] — trainer deletes a template
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  const { templateId } = await params;

  const tmpl = await prisma.routineTemplate.findFirst({
    where: { id: templateId, trainerId: session!.user.profileId },
  });
  if (!tmpl) {
    return NextResponse.json({ success: false, error: "Template no encontrado" }, { status: 404 });
  }

  await prisma.routineTemplate.delete({ where: { id: templateId } });

  return NextResponse.json({ success: true, message: "Template eliminado" });
}
