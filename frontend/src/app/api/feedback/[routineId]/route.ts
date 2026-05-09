import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({
  rating:  z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { routineId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "CLIENT") {
    return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 });
  }

  const routine = await prisma.routine.findFirst({
    where: { id: params.routineId, clientId: session.user.profileId },
  });
  if (!routine) return NextResponse.json({ success: false, error: "Rutina no encontrada" }, { status: 404 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });

  const feedback = await prisma.weeklyFeedback.upsert({
    where:  { routineId: params.routineId },
    create: { routineId: params.routineId, clientId: session.user.profileId, ...parsed.data },
    update: parsed.data,
  });

  return NextResponse.json({ success: true, data: feedback });
}
