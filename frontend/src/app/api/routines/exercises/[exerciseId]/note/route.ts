import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { exerciseId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "CLIENT") {
    return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 });
  }

  const exercise = await prisma.exercise.findUnique({
    where:   { id: params.exerciseId },
    include: { routine: true },
  });

  if (!exercise) return NextResponse.json({ success: false, error: "Ejercicio no encontrado" }, { status: 404 });
  if (exercise.routine.clientId !== session.user.profileId) {
    return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 });
  }

  const body = await req.json();
  const updated = await prisma.exercise.update({
    where: { id: exercise.id },
    data:  { clientNote: body.note ?? null },
  });

  return NextResponse.json({ success: true, data: updated });
}
