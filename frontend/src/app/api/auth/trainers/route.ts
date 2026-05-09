import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const trainers = await prisma.trainer.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { user: { name: "asc" } },
    });

    const data = trainers.map((t) => ({
      id:    t.id,
      name:  t.user.name,
      email: t.user.email,
    }));

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[trainers] DB error:", err);
    return NextResponse.json({ success: false, error: "Error de base de datos" }, { status: 500 });
  }
}
