import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { getMondayOf } from "@/lib/date-utils";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { clientId: string } }) {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  const client = await prisma.client.findFirst({
    where: { id: params.clientId, trainerId: session!.user.profileId },
  });
  if (!client) {
    return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 });
  }

  const routines = await prisma.routine.findMany({
    where: { clientId: params.clientId },
    orderBy: { weekStart: "desc" },
    include: {
      exercises: { orderBy: { order: "asc" } },
      days: { orderBy: { order: "asc" }, include: { exercises: { orderBy: { order: "asc" } } } },
      feedback: true,
    },
  });

  // Obtener todos los logs del cliente para calcular completed por semana de rutina
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

  // Para cada rutina, usar el lunes de su weekStart para determinar los logs de esa semana
  const enriched = routines.map(r => {
    const monday = getMondayOf(r.weekStart);
    const weekKey = monday.toISOString();
    const loggedIds = logsByWeek.get(weekKey) ?? new Set<string>();

    function enrichEx(ex: { id: string; [key: string]: unknown }) {
      return { ...ex, completed: loggedIds.has(ex.id) };
    }

    return {
      ...r,
      exercises: r.exercises.map(enrichEx),
      days: r.days.map(d => ({ ...d, exercises: d.exercises.map(enrichEx) })),
    };
  });

  return NextResponse.json({ success: true, data: enriched });
}
