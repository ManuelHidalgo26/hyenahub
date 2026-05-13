import { NextResponse } from "next/server";
import { requireRole } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function getMondayOfCurrentWeek(): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET() {
  const { session, error } = await requireRole("CLIENT");
  if (error) return error;

  const clientId = session!.user.profileId;

  // La rutina más reciente define el total de ejercicios para el historial
  const currentRoutine = await prisma.routine.findFirst({
    where: { clientId },
    orderBy: { weekStart: "desc" },
    include: { exercises: { select: { id: true } } },
  });

  const total = currentRoutine?.exercises.length ?? 0;
  const exerciseIds = (currentRoutine?.exercises ?? []).map(e => e.id);

  // Calcular el inicio de las últimas 12 semanas
  const monday = getMondayOfCurrentWeek();
  const twelveWeeksAgo = new Date(monday);
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 11 * 7);

  const logs = exerciseIds.length > 0
    ? await prisma.exerciseLog.findMany({
        where: { clientId, weekOf: { gte: twelveWeeksAgo }, exerciseId: { in: exerciseIds } },
        select: { weekOf: true, exerciseId: true },
      })
    : [];

  // Agrupar logs por semana (key = ISO string del lunes)
  const byWeek = new Map<string, Set<string>>();
  for (const log of logs) {
    const key = log.weekOf.toISOString();
    if (!byWeek.has(key)) byWeek.set(key, new Set());
    byWeek.get(key)!.add(log.exerciseId);
  }

  // Generar las 12 semanas consecutivas
  const weeks: { weekStart: string; total: number; done: number; pct: number }[] = [];
  const cursor = new Date(twelveWeeksAgo);
  for (let i = 0; i < 12; i++) {
    const weekKey = new Date(cursor).toISOString();
    const doneSet = byWeek.get(weekKey) ?? new Set<string>();
    const done = doneSet.size;
    weeks.push({
      weekStart: new Date(cursor).toISOString().slice(0, 10),
      total,
      done,
      pct: total > 0 ? Math.round((done / total) * 100) : 0,
    });
    cursor.setDate(cursor.getDate() + 7);
  }

  return NextResponse.json({ success: true, data: weeks });
}
