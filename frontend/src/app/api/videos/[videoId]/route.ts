import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { videoId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TRAINER") {
    return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 });
  }
  const video = await prisma.trainerVideo.findFirst({
    where: { id: params.videoId, trainerId: session.user.profileId },
  });
  if (!video) return NextResponse.json({ success: false, error: "Video no encontrado" }, { status: 404 });

  await prisma.trainerVideo.delete({ where: { id: video.id } });
  console.log(JSON.stringify({ action: "VIDEO_DELETED", actorId: session.user.id, targetId: video.id, ts: new Date() }));
  return NextResponse.json({ success: true, message: "Video eliminado" });
}
