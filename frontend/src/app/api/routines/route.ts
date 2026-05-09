import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

export const dynamic = "force-dynamic";

const exerciseSchema = z.object({
  name:   z.string().min(1),
  sets:   z.number().int().positive(),
  reps:   z.number().int().positive(),
  weight: z.number().optional(),
  notes:  z.string().optional(),
  order:  z.number().int().optional(),
});

const daySchema = z.object({
  name:      z.string().min(1),
  order:     z.number().int().optional(),
  exercises: z.array(exerciseSchema).min(1),
});

const createSchema = z.object({
  clientId:      z.string(),
  weekStart:     z.string().datetime(),
  durationWeeks: z.number().int().min(0).max(52).optional(),
  notes:         z.string().optional(),
  exercises:     z.array(exerciseSchema).optional(),
  days:          z.array(daySchema).optional(),
}).refine(d => (d.exercises && d.exercises.length > 0) || (d.days && d.days.length > 0), {
  message: "Se requiere exercises o days",
});

type ExInput = { name: string; sets: number; reps: number; weight?: number; notes?: string; order: number };

function flattenDays(days: z.infer<typeof daySchema>[]): ExInput[] {
  let i = 0;
  return days.flatMap(day => day.exercises.map(ex => ({ ...ex, order: i++ })));
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TRAINER") {
    return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });

  const { clientId, weekStart, durationWeeks, notes, exercises, days } = parsed.data;

  const client = await prisma.client.findFirst({
    where: { id: clientId, trainerId: session.user.profileId },
  });
  if (!client) return NextResponse.json({ success: false, error: "Cliente no encontrado" }, { status: 403 });

  const flatExercises: ExInput[] = days && days.length > 0
    ? flattenDays(days)
    : (exercises ?? []).map((ex, i) => ({ ...ex, order: ex.order ?? i }));

  const routine = await prisma.routine.create({
    data: {
      clientId,
      weekStart:     new Date(weekStart),
      durationWeeks: durationWeeks ?? 0,
      notes,
      exercises:     { create: flatExercises },
    },
    include: { exercises: { orderBy: { order: "asc" } } },
  });

  await pusherServer.trigger(`private-user-${client.userId}`, "routine.new", {
    routineId: routine.id,
    message:   "Tu entrenador te asignó una nueva rutina 🏋️",
  }).catch(() => {});

  return NextResponse.json({ success: true, data: routine }, { status: 201 });
}
