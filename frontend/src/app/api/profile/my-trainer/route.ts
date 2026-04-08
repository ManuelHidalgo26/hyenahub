import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-auth";

// GET /api/profile/my-trainer — client gets their trainer info + videos
export async function GET() {
  const { session, error } = await requireRole("CLIENT");
  if (error) return error;

  try {
    const client = await prisma.client.findUnique({
      where: { id: session!.user.profileId },
      include: {
        trainer: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } },
            videos: { orderBy: { createdAt: "desc" } },
          },
        },
      },
    });

    if (!client) {
      return NextResponse.json(
        { success: false, error: "Perfil no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: client.trainer });
  } catch (err) {
    console.error("[GET /api/profile/my-trainer]", err);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
