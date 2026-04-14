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

const createSchema = z.object({
  name:        z.string().min(1).max(80),
  description: z.string().max(300).optional(),
  calories:    z.number().int().optional(),
  protein:     z.number().int().optional(),
  carbs:       z.number().int().optional(),
  fat:         z.number().int().optional(),
  meals:       z.array(mealSchema).min(1),
});

// GET /api/diet-templates — trainer's own diet templates
export async function GET() {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  const templates = await prisma.dietTemplate.findMany({
    where: { trainerId: session!.user.profileId },
    orderBy: { createdAt: "desc" },
    include: { meals: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ success: true, data: templates });
}

// POST /api/diet-templates — trainer creates a diet template
export async function POST(req: NextRequest) {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, description, calories, protein, carbs, fat, meals } = parsed.data;

  const template = await prisma.dietTemplate.create({
    data: {
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

  return NextResponse.json({ success: true, data: template }, { status: 201 });
}
