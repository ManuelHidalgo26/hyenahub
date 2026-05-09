import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { templateId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TRAINER") {
    return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 });
  }
  const template = await prisma.routineTemplate.findFirst({
    where: { id: params.templateId, trainerId: session.user.profileId },
  });
  if (!template) return NextResponse.json({ success: false, error: "Template no encontrado" }, { status: 404 });

  await prisma.routineTemplate.delete({ where: { id: template.id } });
  console.log(JSON.stringify({ action: "TEMPLATE_DELETED", actorId: session.user.id, targetId: template.id, ts: new Date() }));
  return NextResponse.json({ success: true, message: "Template eliminado" });
}
