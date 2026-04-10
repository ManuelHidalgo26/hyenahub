import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-auth";

// POST /api/trainer/clients/[clientId]/reset-password
// Trainer resets a client's password and receives the temporary one
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  const { clientId } = await params;

  // Verify this client belongs to the trainer
  const client = await prisma.client.findFirst({
    where: { id: clientId, trainerId: session!.user.profileId },
    include: { user: { select: { id: true, name: true } } },
  });

  if (!client) {
    return NextResponse.json(
      { success: false, error: "Cliente no encontrado o sin acceso" },
      { status: 403 }
    );
  }

  // Generate a readable temporary password: word + 4 digits
  const words = ["Entreno", "Fuerza", "Rutina", "Gym", "Salud", "Fit", "Sport", "Power"];
  const word  = words[Math.floor(Math.random() * words.length)];
  const nums  = String(Math.floor(1000 + Math.random() * 9000));
  const tempPassword = `${word}${nums}`;

  const hashed = await bcrypt.hash(tempPassword, 10);
  await prisma.user.update({
    where: { id: client.user.id },
    data:  { password: hashed },
  });

  return NextResponse.json({ success: true, data: { tempPassword } });
}
