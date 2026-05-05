import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-auth";

// GET /api/routines/client/[clientId] — list routines for a client (trainer view)
export async function GET(
  _req: NextRequest,
  { params }: { params: { clientId: string } }
) {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  try {
    const client = await prisma.client.findFirst({
      where: { id: params.clientId, trainerId: session!.user.profileId },
    });
    if (!client) {
      return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 });
    }

    const routines = await prisma.routine.findMany({
      where:   { clientId: params.clientId },
      orderBy: { weekStart: "desc" },
      include: {
        days: {
          orderBy: { order: "asc" },
          include: { exercises: { orderBy: { order: "asc" } } },
        },
        exercises: {
          where:   { dayId: null },
          orderBy: { order: "asc" },
        },
        feedback: true,
      },
    });

    return NextResponse.json({ success: true, data: routines });
  } catch (err) {
    console.error("[GET /api/routines/client/[clientId]]", err);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
