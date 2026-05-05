import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-auth";

// GET /api/routines/my — client sees their own routines
export async function GET() {
  const { session, error } = await requireRole("CLIENT");
  if (error) return error;

  try {
    // Try with days first; fall back to flat if routine_days table doesn't exist yet
    let routines;
    try {
      routines = await prisma.routine.findMany({
        where:   { clientId: session!.user.profileId },
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
          client:   { select: { trainerId: true } },
          feedback: true,
        },
      });
    } catch {
      // DB doesn't have routine_days yet — return without days
      routines = await prisma.routine.findMany({
        where:   { clientId: session!.user.profileId },
        orderBy: { weekStart: "desc" },
        include: {
          exercises: { orderBy: { order: "asc" } },
          client:    { select: { trainerId: true } },
          feedback:  true,
        },
      });
      // Normalize shape
      routines = (routines as typeof routines).map((r: typeof routines[0] & { days?: unknown[] }) => ({ ...r, days: [] }));
    }

    return NextResponse.json({ success: true, data: routines });
  } catch (err) {
    console.error("[GET /api/routines/my]", err);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
