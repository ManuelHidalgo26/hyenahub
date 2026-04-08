import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-auth";

// GET /api/videos/trainer/[trainerId] — client views their trainer's videos
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ trainerId: string }> }
) {
  const { error } = await requireRole("CLIENT");
  if (error) return error;

  const { trainerId } = await params;

  const videos = await prisma.trainerVideo.findMany({
    where: { trainerId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: videos });
}
