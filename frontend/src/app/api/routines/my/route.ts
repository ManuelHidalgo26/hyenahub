import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-auth";

// GET /api/routines/my — client sees their own routines
export async function GET() {
  const { session, error } = await requireRole("CLIENT");
  if (error) return error;

  try {
    const routines = await prisma.routine.findMany({
      where: { clientId: session!.user.profileId },
      orderBy: { weekStart: "desc" },
      include: {
        exercises: { orderBy: { order: "asc" } },
        client: { select: { trainerId: true } },
        feedback: true,
      },
    });

    return NextResponse.json({ success: true, data: routines });
  } catch (err) {
    console.error("[GET /api/routines/my]", err);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
