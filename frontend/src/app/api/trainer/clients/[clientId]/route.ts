import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET(_req: NextRequest, { params }: { params: { clientId: string } }) {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  const client = await prisma.client.findFirst({
    where: { id: params.clientId, trainerId: session!.user.profileId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      routines: {
        orderBy: { weekStart: "desc" },
        include: {
          exercises: { orderBy: { order: "asc" } },
          days: { orderBy: { order: "asc" }, include: { exercises: { orderBy: { order: "asc" } } } },
          feedback: true,
        },
      },
    },
  });

  if (!client) {
    return NextResponse.json({ success: false, error: "Cliente no encontrado" }, { status: 404 });
  }

  // Enriquecer cada ejercicio con `completed` calculado desde ExerciseLog (fuente única),
  // usando el lunes de la semana de cada rutina — mismo criterio que /api/routines/client/[clientId].
  const allLogs = await prisma.exerciseLog.findMany({
    where: { clientId: params.clientId },
    select: { exerciseId: true, weekOf: true },
  });
  const logsByWeek = new Map<string, Set<string>>();
  for (const log of allLogs) {
    const key = log.weekOf.toISOString();
    if (!logsByWeek.has(key)) logsByWeek.set(key, new Set());
    logsByWeek.get(key)!.add(log.exerciseId);
  }

  const enrichedRoutines = client.routines.map(r => {
    const weekKey = getMondayOf(r.weekStart).toISOString();
    const loggedIds = logsByWeek.get(weekKey) ?? new Set<string>();
    const enrichEx = (ex: { id: string; [key: string]: unknown }) => ({ ...ex, completed: loggedIds.has(ex.id) });
    return {
      ...r,
      exercises: r.exercises.map(enrichEx),
      days: r.days.map(d => ({ ...d, exercises: d.exercises.map(enrichEx) })),
    };
  });

  return NextResponse.json({ success: true, data: { ...client, routines: enrichedRoutines } });
}

const updateSchema = z.object({
  goal:       z.string().optional(),
  experience: z.string().optional(),
  equipment:  z.string().optional(),
  weight:     z.number().optional(),
  age:        z.number().int().optional(),
  notes:      z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { clientId: string } }) {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const client = await prisma.client.findFirst({
    where: { id: params.clientId, trainerId: session!.user.profileId },
  });
  if (!client) {
    return NextResponse.json({ success: false, error: "Cliente no encontrado" }, { status: 404 });
  }

  const updated = await prisma.client.update({ where: { id: client.id }, data: parsed.data });
  return NextResponse.json({ success: true, data: updated });
}
