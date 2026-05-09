import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireRole } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({
  password: z.string().min(6),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const target = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, role: true },
  });
  if (!target) {
    return NextResponse.json({ success: false, error: "Usuario no encontrado" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const hashed = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.update({
    where: { id: params.userId },
    data: { password: hashed },
  });

  return NextResponse.json({ success: true });
}
