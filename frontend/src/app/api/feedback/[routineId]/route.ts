import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const feedbackSchema = z.object({
  rating:  z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { routineId: string } }
) {
  const { session, error } = await requireRole("CLIENT");
  if (error) return error;

  const routine = await prisma.routine.findFirst({
    where: { id: params.routineId, clientId: session!.user.profileId },
  });
  if (!routine) {
    return NextResponse.json({ success: false, error: "Rutina no encontrada" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const feedback = await prisma.weeklyFeedback.upsert({
    where: { routineId: params.routineId },
    create: {
      routineId: params.routineId,
      clientId:  session!.user.profileId,
      rating:    parsed.data.rating,
      comment:   parsed.data.comment,
    },
    update: {
      rating:  parsed.data.rating,
      comment: parsed.data.comment,
    },
  });

  return NextResponse.json({ success: true, data: feedback });
}
