import { NextResponse } from "next/server";
import { requireRole } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, error } = await requireRole("CLIENT");
  if (error) return error;

  const client = await prisma.client.findUnique({
    where: { id: session!.user.profileId },
    include: {
      trainer: {
        include: {
          user:   { select: { id: true, name: true, email: true, avatar: true } },
          videos: { orderBy: { createdAt: "desc" } },
        },
      },
    },
  });

  if (!client) {
    return NextResponse.json({ success: false, error: "Perfil no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: client.trainer });
}
