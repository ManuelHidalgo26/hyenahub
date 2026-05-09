import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TRAINER") {
    return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 });
  }
  const videos = await prisma.trainerVideo.findMany({
    where:   { trainerId: session.user.profileId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ success: true, data: videos });
}

const createSchema = z.object({
  title:       z.string().min(1),
  videoUrl:    z.string().url(),
  description: z.string().optional(),
  exercise:    z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TRAINER") {
    return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 });
  }
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });

  const video = await prisma.trainerVideo.create({
    data: { ...parsed.data, trainerId: session.user.profileId },
  });
  return NextResponse.json({ success: true, data: video }, { status: 201 });
}
