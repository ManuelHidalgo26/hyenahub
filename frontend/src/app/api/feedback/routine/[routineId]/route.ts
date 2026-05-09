import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { routineId: string } }
) {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  const routine = await prisma.routine.findFirst({
    where: {
      id:     params.routineId,
      client: { trainerId: session!.user.profileId },
    },
  });
  if (!routine) {
    return NextResponse.json({ success: false, error: "Rutina no encontrada" }, { status: 404 });
  }

  const feedback = await prisma.weeklyFeedback.findUnique({
    where: { routineId: params.routineId },
  });

  return NextResponse.json({ success: true, data: feedback });
}
