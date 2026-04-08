import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-auth";

// DELETE /api/templates/[templateId] — trainer deletes a template
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  const { templateId } = await params;

  const tmpl = await prisma.routineTemplate.findFirst({
    where: { id: templateId, trainerId: session!.user.profileId },
  });
  if (!tmpl) {
    return NextResponse.json({ success: false, error: "Template no encontrado" }, { status: 404 });
  }

  await prisma.routineTemplate.delete({ where: { id: templateId } });

  return NextResponse.json({ success: true, message: "Template eliminado" });
}
