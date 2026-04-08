import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-auth";

// DELETE /api/videos/[videoId] — trainer deletes a video
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  const { videoId } = await params;

  const video = await prisma.trainerVideo.findFirst({
    where: { id: videoId, trainerId: session!.user.profileId },
  });
  if (!video) {
    return NextResponse.json({ success: false, error: "Video no encontrado" }, { status: 404 });
  }

  await prisma.trainerVideo.delete({ where: { id: videoId } });

  return NextResponse.json({ success: true, message: "Video eliminado" });
}
