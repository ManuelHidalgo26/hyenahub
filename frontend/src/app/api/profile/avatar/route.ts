import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = ["data:image/jpeg;base64,", "data:image/png;base64,", "data:image/webp;base64,", "data:image/gif;base64,"];

function validBase64(v: string) {
  const prefix = ALLOWED.find(p => v.startsWith(p));
  if (!prefix) return false;
  const b64 = v.slice(prefix.length);
  if (!/^[A-Za-z0-9+/]+=*$/.test(b64)) return false;
  return (b64.length * 3) / 4 <= MAX_BYTES;
}

const avatarSchema = z.object({
  avatar: z.union([
    z.string().url(),
    z.literal(""),
    z.string().refine(v => v.startsWith("data:image/") ? validBase64(v) : false, {
      message: "Imagen inválida. Máximo 2MB, formatos: JPEG, PNG, WebP, GIF.",
    }),
  ]),
});

export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const parsed = avatarSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || "Imagen inválida" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: session!.user.id },
    data: { avatar: parsed.data.avatar || null },
    select: { id: true, name: true, email: true, avatar: true, role: true },
  });

  return NextResponse.json({ success: true, data: user });
}
