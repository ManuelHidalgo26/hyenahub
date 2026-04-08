import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-auth";

// GET /api/routines/my/current — current week routine for the client
export async function GET() {
  const { session, error } = await requireRole("CLIENT");
  if (error) return error;

  try {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
    weekStart.setHours(0, 0, 0, 0);

    const routine = await prisma.routine.findFirst({
      where: {
        clientId: session!.user.profileId,
        weekStart: { gte: weekStart },
      },
      orderBy: { weekStart: "desc" },
      include: { exercises: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json({ success: true, data: routine ?? null });
  } catch (err) {
    console.error("[GET /api/routines/my/current]", err);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
