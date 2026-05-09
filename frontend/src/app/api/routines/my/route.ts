import { NextResponse } from "next/server";
import { requireRole } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, error } = await requireRole("CLIENT");
  if (error) return error;

  const routines = await prisma.routine.findMany({
    where: { clientId: session!.user.profileId },
    orderBy: { weekStart: "desc" },
    include: {
      exercises: { orderBy: { order: "asc" } },
      days: { orderBy: { order: "asc" }, include: { exercises: { orderBy: { order: "asc" } } } },
      client: { select: { trainerId: true } },
      feedback: true,
    },
  });

  return NextResponse.json({ success: true, data: routines });
}
