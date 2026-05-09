import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TRAINER") {
    return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 });
  }

  const clients = await prisma.client.findMany({
    where:   { trainerId: session.user.profileId },
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true, createdAt: true } },
      routines: {
        orderBy: { weekStart: "desc" },
        take:    1,
        include: { exercises: { orderBy: { order: "asc" } } },
      },
    },
  });

  return NextResponse.json({ success: true, data: clients });
}
