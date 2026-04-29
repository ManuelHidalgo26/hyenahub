import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-auth";

const MAX_LIMIT = 50;

// GET /api/routines/my?limit=N&cursor=<id>
export async function GET(req: NextRequest) {
  const { session, error } = await requireRole("CLIENT");
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const limit  = Math.min(parseInt(searchParams.get("limit") ?? "10"), MAX_LIMIT);
  const cursor = searchParams.get("cursor") ?? undefined;

  try {
    const routines = await prisma.routine.findMany({
      where: { clientId: session!.user.profileId },
      orderBy: { weekStart: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        exercises: { orderBy: { order: "asc" } },
        client: { select: { trainerId: true } },
        feedback: true,
      },
    });

    const hasMore = routines.length > limit;
    const data = hasMore ? routines.slice(0, limit) : routines;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    return NextResponse.json({ success: true, data, nextCursor });
  } catch (err) {
    console.error("[GET /api/routines/my]", err);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
