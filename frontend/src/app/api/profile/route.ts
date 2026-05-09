import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { id: true, name: true, email: true, avatar: true, role: true },
  });

  if (!user) return NextResponse.json({ success: false, error: "Usuario no encontrado" }, { status: 404 });
  return NextResponse.json({ success: true, data: user });
}

const avatarSchema = z.object({
  avatar: z.string().regex(/^data:image\/(jpeg|png|webp|gif);base64,/, "Formato inválido").max(2_800_000),
});

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const parsed = avatarSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data:  { avatar: parsed.data.avatar },
    select: { id: true, name: true, email: true, avatar: true, role: true },
  });

  return NextResponse.json({ success: true, data: user });
}
