import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-auth";

// DELETE /api/routines/[routineId] — trainer deletes a routine
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { routineId: string } }
) {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  try {
    const routine = await prisma.routine.findFirst({
      where: {
        id: params.routineId,
        client: { trainerId: session!.user.profileId },
      },
    });

    if (!routine) {
      return NextResponse.json(
        { success: false, error: "Rutina no encontrada" },
        { status: 404 }
      );
    }

    await prisma.routine.delete({ where: { id: routine.id } });

    return NextResponse.json({ success: true, message: "Rutina eliminada" });
  } catch (err) {
    console.error("[DELETE /api/routines/[routineId]]", err);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
