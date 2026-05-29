import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { exerciseSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name:          z.string().min(1),
  description:   z.string().optional(),
  durationWeeks: z.number().int().min(0).max(52).optional(),
  exercises:     z.array(exerciseSchema).optional(),
});

export async function GET() {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  const templates = await prisma.routineTemplate.findMany({
    where: { trainerId: session!.user.profileId },
    include: { exercises: { orderBy: { order: "asc" } } },
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

  const { name, description, durationWeeks, exercises } = parsed.data;

  const template = await prisma.routineTemplate.create({
    data: {
      trainerId: session!.user.profileId,
      name,
      description,
      durationWeeks: durationWeeks ?? 0,
      exercises: {
        create: (exercises ?? []).map((ex, i) => ({
          name: ex.name, sets: ex.sets, reps: ex.reps,
          weight: ex.weight, notes: ex.notes, order: ex.order ?? i,
        })),
      },
    },
    include: { exercises: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ success: true, data: template }, { status: 201 });
}
