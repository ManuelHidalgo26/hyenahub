import { NextResponse } from "next/server";
import { requireRole } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: { userId: string } }) {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const user = await prisma.user.findUnique({ where: { id: params.userId } });
  if (!user) {
    return NextResponse.json({ success: false, error: "Usuario no encontrado" }, { status: 404 });
  }

  await prisma.user.delete({ where: { id: user.id } });

  return NextResponse.json({ success: true, message: "Usuario eliminado" });
}
