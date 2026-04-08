import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/server-auth";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_MIME = [
  "data:image/jpeg;base64,",
  "data:image/png;base64,",
  "data:image/webp;base64,",
  "data:image/gif;base64,",
];

function validateBase64Avatar(value: string): boolean {
  const prefix = ALLOWED_MIME.find((p) => value.startsWith(p));
  if (!prefix) return false;
  const base64 = value.slice(prefix.length);
  if (!/^[A-Za-z0-9+/]+=*$/.test(base64)) return false;
  const estimatedBytes = (base64.length * 3) / 4;
  return estimatedBytes <= MAX_AVATAR_BYTES;
}

const avatarSchema = z.object({
  avatar: z.union([
    z.string().url(),
    z.literal(""),
    z.string().refine(
      (v) => (v.startsWith("data:image/") ? validateBase64Avatar(v) : false),
      { message: "Imagen inválida. Máximo 2MB, formatos: JPEG, PNG, WebP, GIF." }
    ),
  ]),
});

// GET /api/profile — returns current user profile
export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const user = await prisma.user.findUnique({
      where: { id: session!.user.id },
      select: { id: true, name: true, email: true, avatar: true, role: true },
    });

    return NextResponse.json({ success: true, data: user });
  } catch (err) {
    console.error("[GET /api/profile]", err);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// PATCH /api/profile — updates avatar
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = avatarSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            parsed.error.issues[0]?.message || "Imagen inválida",
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id: session!.user.id },
      data: { avatar: parsed.data.avatar || null },
      select: { id: true, name: true, email: true, avatar: true, role: true },
    });

    return NextResponse.json({ success: true, data: user });
  } catch (err) {
    console.error("[PATCH /api/profile]", err);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
