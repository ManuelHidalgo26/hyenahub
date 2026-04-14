import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-auth";

const mealSchema = z.object({
  name:     z.string().min(1),
  time:     z.string().optional(),
  foods:    z.string().min(1),
  calories: z.number().int().optional(),
  protein:  z.number().int().optional(),
  carbs:    z.number().int().optional(),
  fat:      z.number().int().optional(),
  notes:    z.string().optional(),
  order:    z.number().int().optional(),
});

const patchSchema = z.object({
  name:        z.string().min(1).max(80).optional(),
  description: z.string().max(300).optional(),
  calories:    z.number().int().optional(),
  protein:     z.number().int().optional(),
  carbs:       z.number().int().optional(),
  fat:         z.number().int().optional(),
  meals:       z.array(mealSchema).min(1),
});

// PATCH /api/diet-templates/[templateId] — trainer edits a diet template
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  const { templateId } = await params;

  const tmpl = await prisma.dietTemplate.findFirst({
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

  const { name, description, calories, protein, carbs, fat, meals } = parsed.data;

  await prisma.dietTemplateMeal.deleteMany({ where: { templateId } });

  const updated = await prisma.dietTemplate.update({
    where: { id: templateId },
    data: {
      ...(name        !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(calories    !== undefined && { calories }),
      ...(protein     !== undefined && { protein }),
      ...(carbs       !== undefined && { carbs }),
      ...(fat         !== undefined && { fat }),
      meals: {
        create: meals.map((m, i) => ({ ...m, order: m.order ?? i })),
      },
    },
    include: { meals: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ success: true, data: updated });
}

// DELETE /api/diet-templates/[templateId] — trainer deletes a diet template
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  const { templateId } = await params;

  const tmpl = await prisma.dietTemplate.findFirst({
    where: { id: templateId, trainerId: session!.user.profileId },
  });
  if (!tmpl) {
    return NextResponse.json({ success: false, error: "Template no encontrado" }, { status: 404 });
  }

  await prisma.dietTemplate.delete({ where: { id: templateId } });

  return NextResponse.json({ success: true, message: "Template eliminado" });
}
