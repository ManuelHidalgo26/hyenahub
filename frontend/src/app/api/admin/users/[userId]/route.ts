import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 });
  }

  if (params.userId === session.user.id) {
    return NextResponse.json({ success: false, error: "No puedes eliminarte a ti mismo" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id: params.userId } });
  console.log(JSON.stringify({ action: "USER_DELETED", actorId: session.user.id, targetId: params.userId, ts: new Date() }));

  return NextResponse.json({ success: true });
}
