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

const createSchema = z.object({
  name:          z.string().min(1).max(80),
  description:   z.string().max(300).optional(),
  durationWeeks: z.number().int().min(1).max(52).default(4),
  exercises:     z.array(exerciseSchema).min(1),
});

// GET /api/templates — trainer's own templates
export async function GET() {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  const templates = await prisma.routineTemplate.findMany({
    where: { trainerId: session!.user.profileId },
    orderBy: { createdAt: "desc" },
    include: { exercises: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ success: true, data: templates });
}

// POST /api/templates — trainer creates a template
export async function POST(req: NextRequest) {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, description, durationWeeks, exercises } = parsed.data;

  const template = await prisma.routineTemplate.create({
    data: {
      trainerId: session!.user.profileId,
      name,
      description,
      durationWeeks,
      exercises: {
        create: exercises.map((ex, i) => ({ ...ex, order: ex.order ?? i })),
      },
    },
    include: { exercises: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ success: true, data: template }, { status: 201 });
}
