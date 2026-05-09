import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 });
  }

  const trainers = await prisma.trainer.findMany({
    include: {
      user:    { select: { id: true, name: true, email: true, avatar: true, createdAt: true } },
      clients: { select: { id: true } },
    },
    orderBy: { user: { createdAt: "desc" } },
  });

  return NextResponse.json({ success: true, data: trainers });
}
