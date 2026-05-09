import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  const videos = await prisma.trainerVideo.findMany({
    where: { trainerId: session!.user.profileId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: videos });
}

const createSchema = z.object({
  title:       z.string().min(1),
  description: z.string().optional(),
  videoUrl:    z.string().url(),
  exercise:    z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const video = await prisma.trainerVideo.create({
    data: { ...parsed.data, trainerId: session!.user.profileId },
  });

  return NextResponse.json({ success: true, data: video }, { status: 201 });
}
