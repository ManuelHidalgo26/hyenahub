import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { exerciseId: string } }) {
  const { session, error } = await requireRole("CLIENT");
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const note: string | null = body.note ?? null;

  const exercise = await prisma.exercise.findUnique({
    where: { id: params.exerciseId },
    include: { routine: true },
  });
  if (!exercise) {
    return NextResponse.json({ success: false, error: "Ejercicio no encontrado" }, { status: 404 });
  }
  if (exercise.routine.clientId !== session!.user.profileId) {
    return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 });
  }

  const updated = await prisma.exercise.update({
    where: { id: exercise.id },
    data: { clientNote: note || null },
  });

  return NextResponse.json({ success: true, data: updated });
}
