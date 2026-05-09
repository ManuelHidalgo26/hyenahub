import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "CLIENT") {
    return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 });
  }

  const client = await prisma.client.findUnique({
    where:   { id: session.user.profileId },
    include: {
      trainer: {
        include: {
          user:   { select: { id: true, name: true, email: true, avatar: true } },
          videos: { orderBy: { createdAt: "desc" } },
        },
      },
    },
  });

  if (!client) return NextResponse.json({ success: false, error: "Cliente no encontrado" }, { status: 404 });

  return NextResponse.json({ success: true, data: client.trainer });
}
