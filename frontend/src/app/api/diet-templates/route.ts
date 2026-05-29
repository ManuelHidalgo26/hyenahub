import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { mealSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name:        z.string().min(1),
  description: z.string().optional(),
  calories:    z.number().int().optional(),
  protein:     z.number().int().optional(),
  carbs:       z.number().int().optional(),
  fat:         z.number().int().optional(),
  meals:       z.array(mealSchema).optional(),
});

export async function GET() {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  const templates = await prisma.dietTemplate.findMany({
    where: { trainerId: session!.user.profileId },
    include: { meals: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: templates });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const { meals, ...rest } = parsed.data;

  const template = await prisma.dietTemplate.create({
    data: {
      ...rest,
      trainerId: session!.user.profileId,
      meals: {
        create: (meals ?? []).map((m, i) => ({ ...m, order: m.order ?? i })),
      },
    },
    include: { meals: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ success: true, data: template }, { status: 201 });
}
