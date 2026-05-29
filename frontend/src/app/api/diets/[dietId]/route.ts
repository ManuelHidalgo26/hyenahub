import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { mealSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

const putSchema = z.object({
  name:        z.string().min(1).optional(),
  description: z.string().optional(),
  calories:    z.number().int().optional(),
  protein:     z.number().int().optional(),
  carbs:       z.number().int().optional(),
  fat:         z.number().int().optional(),
  meals:       z.array(mealSchema).optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { dietId: string } }
) {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  const diet = await prisma.diet.findFirst({
    where: { id: params.dietId, trainerId: session!.user.profileId },
  });
  if (!diet) {
    return NextResponse.json({ success: false, error: "Dieta no encontrada" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const { meals, ...rest } = parsed.data;

  const updated = await prisma.$transaction(async (tx) => {
    if (meals !== undefined) {
      await tx.meal.deleteMany({ where: { dietId: params.dietId } });
      if (meals.length > 0) {
        await tx.meal.createMany({
          data: meals.map((m, i) => ({ ...m, dietId: params.dietId, order: m.order ?? i })),
        });
      }
    }
    return tx.diet.update({
      where: { id: params.dietId },
      data: rest,
      include: { meals: { orderBy: { order: "asc" } } },
    });
  });

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { dietId: string } }
) {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  const diet = await prisma.diet.findFirst({
    where: { id: params.dietId, trainerId: session!.user.profileId },
  });
  if (!diet) {
    return NextResponse.json({ success: false, error: "Dieta no encontrada" }, { status: 404 });
  }

  await prisma.diet.delete({ where: { id: params.dietId } });

  return NextResponse.json({ success: true });
}
