import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(_req: Request, { params }: { params: { routineId: string } }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const role      = session!.user.role;
  const profileId = session!.user.profileId;

  const routine = await prisma.routine.findUnique({
    where: { id: params.routineId },
    include: { client: true },
  });
  if (!routine) return NextResponse.json({ success: false, error: "Rutina no encontrada" }, { status: 404 });

  const isOwnerTrainer = role === "TRAINER" && routine.client.trainerId === profileId;
  const isOwnerClient  = role === "CLIENT"  && routine.clientId === profileId;
  if (!isOwnerTrainer && !isOwnerClient) {
    return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 });
  }

  const updated = await prisma.routine.update({
    where: { id: params.routineId },
    data: { hidden: !routine.hidden },
  });

  return NextResponse.json({ success: true, data: { id: updated.id, hidden: updated.hidden } });
}
