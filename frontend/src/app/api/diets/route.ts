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

const createDietSchema = z.object({
  clientId:    z.string(),
  name:        z.string().min(1),
  description: z.string().optional(),
  calories:    z.number().int().nonnegative().optional(),
  protein:     z.number().int().nonnegative().optional(),
  carbs:       z.number().int().nonnegative().optional(),
  fat:         z.number().int().nonnegative().optional(),
  meals:       z.array(mealSchema).min(1),
});

// POST /api/diets — trainer creates a diet for a client
export async function POST(req: NextRequest) {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  const body = await req.json();
  const parsed = createDietSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const { clientId, name, description, calories, protein, carbs, fat, meals } = parsed.data;

  // Verify the client belongs to this trainer
  const client = await prisma.client.findFirst({
    where: { id: clientId, trainerId: session!.user.profileId },
  });
  if (!client) {
    return NextResponse.json({ success: false, error: "Cliente no encontrado o sin acceso" }, { status: 403 });
  }

  const diet = await prisma.diet.create({
    data: {
      clientId,
      trainerId: session!.user.profileId,
      name,
      description,
      calories,
      protein,
      carbs,
      fat,
      meals: {
        create: meals.map((m, i) => ({ ...m, order: m.order ?? i })),
      },
    },
    include: { meals: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ success: true, data: diet }, { status: 201 });
}

// GET /api/diets — client gets their own diets
export async function GET() {
  const { session, error } = await requireRole("CLIENT");
  if (error) return error;

  const diets = await prisma.diet.findMany({
    where: { clientId: session!.user.profileId },
    orderBy: { createdAt: "desc" },
    include: { meals: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ success: true, data: diets });
}
