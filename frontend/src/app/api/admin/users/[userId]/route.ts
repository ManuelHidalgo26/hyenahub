import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-auth";

// DELETE /api/admin/users/[userId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const { userId } = await params;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ success: false, error: "Usuario no encontrado" }, { status: 404 });
  }

  // If deleting a trainer, remove their clients first to avoid FK constraint
  // (Client.trainerId → Trainer.id has no onDelete cascade in schema)
  if (user.role === "TRAINER") {
    const trainer = await prisma.trainer.findUnique({ where: { userId } });
    if (trainer) {
      await prisma.client.deleteMany({ where: { trainerId: trainer.id } });
    }
  }

  await prisma.user.delete({ where: { id: userId } });

  return NextResponse.json({ success: true, message: "Usuario eliminado" });
}
