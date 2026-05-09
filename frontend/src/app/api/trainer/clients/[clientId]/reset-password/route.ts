import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireRole } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: { clientId: string } }) {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  const client = await prisma.client.findFirst({
    where: { id: params.clientId, trainerId: session!.user.profileId },
    include: { user: { select: { id: true } } },
  });
  if (!client) {
    return NextResponse.json({ success: false, error: "Cliente no encontrado o sin acceso" }, { status: 403 });
  }

  const words = ["Entreno", "Fuerza", "Rutina", "Gym", "Salud", "Fit", "Sport", "Power"];
  const word = words[Math.floor(Math.random() * words.length)];
  const nums = String(Math.floor(1000 + Math.random() * 9000));
  const tempPassword = `${word}${nums}`;

  await prisma.user.update({
    where: { id: client.user.id },
    data: { password: await bcrypt.hash(tempPassword, 10) },
  });

  return NextResponse.json({ success: true, data: { tempPassword } });
}
