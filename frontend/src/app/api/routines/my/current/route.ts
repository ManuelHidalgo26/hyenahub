import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-auth";

// GET /api/routines/my/current — current week routine for the client
export async function GET() {
  const { session, error } = await requireRole("CLIENT");
  if (error) return error;

  try {
    // Fetch all routines for the client, newest first
    const routines = await prisma.routine.findMany({
      where: { clientId: session!.user.profileId },
      orderBy: { weekStart: "desc" },
      include: { exercises: { orderBy: { order: "asc" } } },
    });

    // Return the first routine whose duration hasn't expired yet
    const now = Date.now();
    const activeRoutine = routines.find(r => {
      const endTime = new Date(r.weekStart).getTime() +
        (r.durationWeeks ?? 4) * 7 * 24 * 60 * 60 * 1000;
      return endTime > now;
    }) ?? null;

    return NextResponse.json({ success: true, data: activeRoutine });
  } catch (err) {
    console.error("[GET /api/routines/my/current]", err);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
