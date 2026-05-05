import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-auth";

// GET /api/routines/my — client sees their own routines
export async function GET() {
  const { session, error } = await requireRole("CLIENT");
  if (error) return error;

  try {
    const routines = await prisma.routine.findMany({
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
    }).catch(async () => {
      // DB doesn't have routine_days yet — return flat shape with empty days
      const flat = await prisma.routine.findMany({
        where:   { clientId: session!.user.profileId },
        orderBy: { weekStart: "desc" },
        include: {
          exercises: { orderBy: { order: "asc" } },
          client:    { select: { trainerId: true } },
          feedback:  true,
        },
      });
      return flat.map(r => ({ ...r, days: [] as never[] }));
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
