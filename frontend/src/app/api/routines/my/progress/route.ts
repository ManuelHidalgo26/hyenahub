import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-auth";

// GET /api/routines/my/progress — last 12 weeks stats for the client
export async function GET() {
  const { session, error } = await requireRole("CLIENT");
  if (error) return error;

  try {
    const routines = await prisma.routine.findMany({
      where: { clientId: session!.user.profileId },
      orderBy: { weekStart: "asc" },
      take: 12,
      include: { exercises: { select: { completed: true } } },
    });

    const data = routines.map((r) => {
      const total = r.exercises.length;
      const done = r.exercises.filter((e) => e.completed).length;
      return {
        weekStart: r.weekStart.toISOString().split("T")[0],
        total,
        done,
        pct: total > 0 ? Math.round((done / total) * 100) : 0,
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[GET /api/routines/my/progress]", err);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
