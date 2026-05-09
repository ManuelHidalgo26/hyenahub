import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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
  name:        z.string().min(1).optional(),
  description: z.string().optional(),
  calories:    z.number().int().optional(),
  protein:     z.number().int().optional(),
  carbs:       z.number().int().optional(),
  fat:         z.number().int().optional(),
  meals:       z.array(mealSchema).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { templateId: string } }
) {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  const template = await prisma.dietTemplate.findFirst({
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

  const { meals, ...rest } = parsed.data;

  const updated = await prisma.$transaction(async (tx) => {
    if (meals !== undefined) {
      await tx.dietTemplateMeal.deleteMany({ where: { templateId: params.templateId } });
      if (meals.length > 0) {
        await tx.dietTemplateMeal.createMany({
          data: meals.map((m, i) => ({ ...m, templateId: params.templateId, order: m.order ?? i })),
        });
      }
    }
    return tx.dietTemplate.update({
      where: { id: params.templateId },
      data: rest,
      include: { meals: { orderBy: { order: "asc" } } },
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

  const template = await prisma.dietTemplate.findFirst({
    where: { id: params.templateId, trainerId: session!.user.profileId },
  });
  if (!template) {
    return NextResponse.json({ success: false, error: "Plantilla no encontrada" }, { status: 404 });
  }

  await prisma.dietTemplate.delete({ where: { id: params.templateId } });

  return NextResponse.json({ success: true });
}
