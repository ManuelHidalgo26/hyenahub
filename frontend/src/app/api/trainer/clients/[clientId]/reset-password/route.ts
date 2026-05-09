import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: { clientId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TRAINER") {
    return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 });
  }

  const client = await prisma.client.findFirst({
    where:   { id: params.clientId, trainerId: session.user.profileId },
    include: { user: true },
  });
  if (!client) return NextResponse.json({ success: false, error: "Cliente no encontrado" }, { status: 404 });

  const words = ["Fitness", "Strong", "Power", "Energy", "Train", "Hyena", "Lion", "Tiger"];
  const word = words[Math.floor(Math.random() * words.length)];
  const digits = Math.floor(1000 + Math.random() * 9000);
  const tempPassword = `${word}${digits}`;

  await prisma.user.update({
    where: { id: client.userId },
    data:  { password: await bcrypt.hash(tempPassword, 10) },
  });

  return NextResponse.json({ success: true, data: { tempPassword } });
}
