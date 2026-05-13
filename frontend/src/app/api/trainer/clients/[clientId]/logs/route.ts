import { NextResponse } from "next/server";
import { requireRole } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function DELETE(req: Request, { params }: { params: { clientId: string } }) {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  const client = await prisma.client.findFirst({
    where: { id: params.clientId, trainerId: session!.user.profileId },
  });
  if (!client) {
    return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const weekOfParam = searchParams.get("weekOf");
  if (!weekOfParam) {
    return NextResponse.json({ success: false, error: "weekOf requerido" }, { status: 400 });
  }

  const weekOf = new Date(weekOfParam);
  if (isNaN(weekOf.getTime())) {
    return NextResponse.json({ success: false, error: "Fecha inválida" }, { status: 400 });
  }

  const { count } = await prisma.exerciseLog.deleteMany({
    where: { clientId: params.clientId, weekOf },
  });

  return NextResponse.json({ success: true, data: { deleted: count } });
}
