import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/server-auth";

const schema = z.object({
  currentPassword: z.string().min(1, "Ingresá tu contraseña actual"),
  newPassword: z
    .string()
    .min(6, "La nueva contraseña debe tener al menos 6 caracteres")
    .max(72, "La contraseña es demasiado larga"),
});

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session!.user.id },
      select: { password: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "Usuario no encontrado" }, { status: 404 });
    }

    const match = await bcrypt.compare(parsed.data.currentPassword, user.password);
    if (!match) {
      return NextResponse.json(
        { success: false, error: "La contraseña actual es incorrecta" },
        { status: 400 }
      );
    }

    const hashed = await bcrypt.hash(parsed.data.newPassword, 10);
    await prisma.user.update({
      where: { id: session!.user.id },
      data: { password: hashed },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/profile/change-password]", err);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
