import { NextResponse } from "next/server";
import { requireRole } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { getMondayOfCurrentWeek } from "@/lib/date-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  const weekOf = getMondayOfCurrentWeek();

  const clients = await prisma.client.findMany({
    where: { trainerId: session!.user.profileId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      routines: {
        orderBy: { weekStart: "desc" },
        take: 1,
        include: { exercises: { select: { id: true } } },
      },
    },
  });

  const clientIds = clients.map(c => c.id);

  // Logs de la semana actual para todos los clientes del trainer
  const logs = await prisma.exerciseLog.findMany({
    where: { clientId: { in: clientIds }, weekOf },
    select: { exerciseId: true, clientId: true },
  });

  const logsByClient = new Map<string, Set<string>>();
  for (const log of logs) {
    if (!logsByClient.has(log.clientId)) logsByClient.set(log.clientId, new Set());
    logsByClient.get(log.clientId)!.add(log.exerciseId);
  }

  // Enriquecer con completed (esta semana) para mantener compatibilidad con el frontend del trainer
  const enriched = clients.map(c => {
    const clientLogs = logsByClient.get(c.id) ?? new Set<string>();
    return {
      ...c,
      routines: c.routines.map(r => ({
        ...r,
        exercises: r.exercises.map(ex => ({ ...ex, completed: clientLogs.has(ex.id) })),
      })),
    };
  });

  return NextResponse.json({ success: true, data: enriched });
}
