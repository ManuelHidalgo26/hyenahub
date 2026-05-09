import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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

const updateSchema = z.object({
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
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TRAINER") {
    return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 });
  }
  const diet = await prisma.diet.findFirst({ where: { id: params.dietId, trainerId: session.user.profileId } });
  if (!diet) return NextResponse.json({ success: false, error: "Dieta no encontrada" }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });

  const { meals, ...rest } = parsed.data;

  if (meals) await prisma.meal.deleteMany({ where: { dietId: diet.id } });

  const updated = await prisma.diet.update({
    where: { id: diet.id },
    data: {
      ...rest,
      ...(meals && { meals: { create: meals.map((m, i) => ({ ...m, order: m.order ?? i })) } }),
    },
    include: { meals: { orderBy: { order: "asc" } } },
  });
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { dietId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TRAINER") {
    return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 });
  }
  const diet = await prisma.diet.findFirst({ where: { id: params.dietId, trainerId: session.user.profileId } });
  if (!diet) return NextResponse.json({ success: false, error: "Dieta no encontrada" }, { status: 404 });

  await prisma.diet.delete({ where: { id: diet.id } });
  console.log(JSON.stringify({ action: "DIET_DELETED", actorId: session.user.id, targetId: diet.id, ts: new Date() }));
  return NextResponse.json({ success: true, message: "Dieta eliminada" });
}
