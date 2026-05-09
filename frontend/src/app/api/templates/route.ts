import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name:          z.string().min(1).max(80),
  description:   z.string().max(300).optional(),
  durationWeeks: z.number().int().min(0).max(52).optional(),
  exercises: z.array(z.object({
    name:   z.string().min(1),
    sets:   z.number().int().positive(),
    reps:   z.number().int().positive(),
    weight: z.number().optional(),
    notes:  z.string().optional(),
    order:  z.number().int().optional(),
  })).min(1),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TRAINER") {
    return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 });
  }
  const templates = await prisma.routineTemplate.findMany({
    where:   { trainerId: session.user.profileId },
    include: { exercises: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ success: true, data: templates });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TRAINER") {
    return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 });
  }
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });

  const { exercises, ...rest } = parsed.data;
  const template = await prisma.routineTemplate.create({
    data: {
      ...rest,
      trainerId: session.user.profileId,
      exercises: { create: exercises.map((ex, i) => ({ ...ex, order: ex.order ?? i })) },
    },
    include: { exercises: { orderBy: { order: "asc" } } },
  });
  return NextResponse.json({ success: true, data: template }, { status: 201 });
}
