import { Response } from "express";
import { z } from "zod";
import { prisma } from "../services/prisma.service";
import { AuthRequest } from "../types";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_MIME = ["data:image/jpeg;base64,", "data:image/png;base64,", "data:image/webp;base64,", "data:image/gif;base64,"];

function validateBase64Avatar(value: string): boolean {
  const prefix = ALLOWED_MIME.find(p => value.startsWith(p));
  if (!prefix) return false;
  const base64 = value.slice(prefix.length);
  // solo caracteres válidos de base64
  if (!/^[A-Za-z0-9+/]+=*$/.test(base64)) return false;
  // tamaño: cada carácter base64 ≈ 0.75 bytes
  const estimatedBytes = (base64.length * 3) / 4;
  return estimatedBytes <= MAX_AVATAR_BYTES;
}

const avatarSchema = z.object({
  avatar: z.union([
    z.string().url(),
    z.literal(""),
    z.string().refine(
      v => v.startsWith("data:image/") ? validateBase64Avatar(v) : false,
      { message: "Imagen inválida. Máximo 2MB, formatos: JPEG, PNG, WebP, GIF." }
    ),
  ]),
});

// PATCH /profile/avatar
export async function updateAvatar(req: AuthRequest, res: Response) {
  const parsed = avatarSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors[0]?.message || "Imagen inválida" });
    return;
  }
  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data:  { avatar: parsed.data.avatar || null },
    select: { id: true, name: true, email: true, avatar: true, role: true },
  });
  res.json({ success: true, data: user });
}

// GET /profile/me
export async function getMe(req: AuthRequest, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, name: true, email: true, avatar: true, role: true },
  });
  res.json({ success: true, data: user });
}

// GET /profile/my-trainer — client gets their trainer info + videos
export async function getMyTrainer(req: AuthRequest, res: Response) {
  const client = await prisma.client.findUnique({
    where: { id: req.user!.profileId },
    include: {
      trainer: {
        include: {
          user:   { select: { id: true, name: true, email: true, avatar: true } },
          videos: { orderBy: { createdAt: "desc" } },
        },
      },
    },
  });

  if (!client) {
    res.status(404).json({ success: false, error: "Perfil no encontrado" });
    return;
  }

  res.json({ success: true, data: client.trainer });
}
