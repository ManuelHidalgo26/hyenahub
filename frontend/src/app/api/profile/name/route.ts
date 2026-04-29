import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/server-auth";

const schema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(60, "El nombre es demasiado largo"),
});

export async function PATCH(req: NextRequest) {
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

    const user = await prisma.user.update({
      where: { id: session!.user.id },
      data: { name: parsed.data.name.trim() },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json({ success: true, data: user });
  } catch (err) {
    console.error("[PATCH /api/profile/name]", err);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
