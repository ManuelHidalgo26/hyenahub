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

const createSchema = z.object({
  clientId:    z.string(),
  name:        z.string().min(1),
  description: z.string().optional(),
  calories:    z.number().int().optional(),
  protein:     z.number().int().optional(),
  carbs:       z.number().int().optional(),
  fat:         z.number().int().optional(),
  meals:       z.array(mealSchema).optional(),
});

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole("CLIENT");
  if (error) return error;

  const diets = await prisma.diet.findMany({
    where: { clientId: session!.user.profileId },
    include: { meals: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: diets });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const { clientId, meals, ...rest } = parsed.data;

  const client = await prisma.client.findFirst({
    where: { id: clientId, trainerId: session!.user.profileId },
  });
  if (!client) {
    return NextResponse.json({ success: false, error: "Cliente no encontrado" }, { status: 403 });
  }

  const diet = await prisma.diet.create({
    data: {
      ...rest,
      clientId,
      trainerId: session!.user.profileId,
      meals: {
        create: (meals ?? []).map((m, i) => ({ ...m, order: m.order ?? i })),
      },
    },
    include: { meals: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ success: true, data: diet }, { status: 201 });
}
