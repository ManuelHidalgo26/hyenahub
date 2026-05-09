import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { trainerId: string } }) {
  const { error } = await requireAuth();
  if (error) return error;

  const videos = await prisma.trainerVideo.findMany({
    where: { trainerId: params.trainerId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: videos });
}
