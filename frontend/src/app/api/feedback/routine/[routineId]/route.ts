import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-auth";

// GET /api/feedback/routine/[routineId] — trainer gets feedback for a routine
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ routineId: string }> }
) {
  const { error } = await requireRole("TRAINER");
  if (error) return error;

  const { routineId } = await params;

  const feedback = await prisma.weeklyFeedback.findUnique({
    where: { routineId },
  });

  return NextResponse.json({ success: true, data: feedback ?? null });
}
