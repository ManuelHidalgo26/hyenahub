import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const trainers = await prisma.trainer.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
      },
      orderBy: { user: { name: "asc" } },
    });

    const result = trainers.map((t) => ({
      id: t.id,
      name: t.user.name,
      email: t.user.email,
      avatar: t.user.avatar,
      specialty: t.specialty,
      bio: t.bio,
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/trainers] ERROR:", msg);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
