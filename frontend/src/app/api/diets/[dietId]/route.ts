import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-auth";

const mealSchema = z.object({
  name:     z.string().min(1),
  time:     z.string().optional(),
  foods:    z.string().min(1),
  calories: z.number().int().nonnegative().optional(),
  protein:  z.number().int().nonnegative().optional(),
  carbs:    z.number().int().nonnegative().optional(),
  fat:      z.number().int().nonnegative().optional(),
  notes:    z.string().optional(),
  order:    z.number().int().optional(),
});

const updateDietSchema = z.object({
  name:        z.string().min(1).optional(),
  description: z.string().optional(),
  calories:    z.number().int().nonnegative().optional(),
  protein:     z.number().int().nonnegative().optional(),
  carbs:       z.number().int().nonnegative().optional(),
  fat:         z.number().int().nonnegative().optional(),
  meals:       z.array(mealSchema).min(1).optional(),
});

// PUT /api/diets/[dietId] — trainer updates a diet
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ dietId: string }> }
) {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  const { dietId } = await params;
  const body = await req.json();
  const parsed = updateDietSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  // Verify ownership
  const existing = await prisma.diet.findFirst({
    where: { id: dietId, trainerId: session!.user.profileId },
  });
  if (!existing) {
    return NextResponse.json({ success: false, error: "Dieta no encontrada o sin acceso" }, { status: 403 });
  }

  const { name, description, calories, protein, carbs, fat, meals } = parsed.data;

  // Replace meals: delete old + create new
  await prisma.meal.deleteMany({ where: { dietId } });

  const diet = await prisma.diet.update({
    where: { id: dietId },
    data: {
      ...(name        !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(calories    !== undefined && { calories }),
      ...(protein     !== undefined && { protein }),
      ...(carbs       !== undefined && { carbs }),
      ...(fat         !== undefined && { fat }),
      ...(meals && {
        meals: {
          create: meals.map((m, i) => ({ ...m, order: m.order ?? i })),
        },
      }),
    },
    include: { meals: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ success: true, data: diet });
}

// DELETE /api/diets/[dietId] — trainer deletes a diet
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ dietId: string }> }
) {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  const { dietId } = await params;

  const existing = await prisma.diet.findFirst({
    where: { id: dietId, trainerId: session!.user.profileId },
  });
  if (!existing) {
    return NextResponse.json({ success: false, error: "Dieta no encontrada o sin acceso" }, { status: 403 });
  }

  await prisma.diet.delete({ where: { id: dietId } });

  return NextResponse.json({ success: true, data: null });
}
