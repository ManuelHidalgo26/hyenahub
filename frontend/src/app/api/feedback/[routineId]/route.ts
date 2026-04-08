import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-auth";

const feedbackSchema = z.object({
  rating:  z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

// POST /api/feedback/[routineId] — client submits or updates feedback for a routine
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ routineId: string }> }
) {
  const { session, error } = await requireRole("CLIENT");
  if (error) return error;

  const { routineId } = await params;
  const body = await req.json();
  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  // Verify routine belongs to this client
  const routine = await prisma.routine.findFirst({
    where: { id: routineId, client: { userId: session!.user.id } },
    select: { id: true, clientId: true },
  });
  if (!routine) {
    return NextResponse.json({ success: false, error: "Rutina no encontrada" }, { status: 404 });
  }

  const feedback = await prisma.weeklyFeedback.upsert({
    where:  { routineId: routine.id },
    create: { routineId: routine.id, clientId: routine.clientId, ...parsed.data },
    update: parsed.data,
  });

  return NextResponse.json({ success: true, data: feedback });
}
