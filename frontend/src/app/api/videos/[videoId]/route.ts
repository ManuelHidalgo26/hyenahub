import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, { params }: { params: { videoId: string } }) {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  const video = await prisma.trainerVideo.findFirst({
    where: { id: params.videoId, trainerId: session!.user.profileId },
  });
  if (!video) {
    return NextResponse.json({ success: false, error: "Video no encontrado" }, { status: 404 });
  }

  await prisma.trainerVideo.delete({ where: { id: video.id } });
  return NextResponse.json({ success: true, message: "Video eliminado" });
}
