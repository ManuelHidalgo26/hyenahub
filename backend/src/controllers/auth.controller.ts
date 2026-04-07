import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../services/prisma.service";
import { AuthRequest } from "../types";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  role: z.enum(["TRAINER", "CLIENT"]),
  trainerId: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const REFRESH_TOKEN_TTL_DAYS = 30;

function signAccessToken(userId: string, email: string, role: Role, profileId: string) {
  return jwt.sign(
    { userId, email, role, profileId },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
  );
}

async function createRefreshToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(64).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);
  await prisma.refreshToken.create({ data: { token, userId, expiresAt } });
  return token;
}

export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const { email, password, name, role, trainerId } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    res.status(409).json({ success: false, error: "Email ya registrado" });
    return;
  }

  if (role === "CLIENT" && !trainerId) {
    res.status(400).json({ success: false, error: "trainerId es requerido para clientes" });
    return;
  }

  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      name,
      role: role as Role,
      ...(role === "TRAINER" && {
        trainer: { create: {} },
      }),
      ...(role === "CLIENT" && {
        client: {
          create: {
            trainerId: trainerId!,
            goal: "",
            experience: "beginner",
            equipment: "none",
          },
        },
      }),
    },
    include: { trainer: true, client: true },
  });

  const profileId =
    role === "TRAINER" ? user.trainer!.id : user.client!.id;

  const token = signAccessToken(user.id, user.email, user.role, profileId);
  const refreshToken = await createRefreshToken(user.id);

  res.status(201).json({
    success: true,
    data: {
      token,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    },
  });
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { trainer: true, client: true },
  });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ success: false, error: "Credenciales inválidas" });
    return;
  }

  const profileId =
    user.role === "TRAINER"
      ? user.trainer?.id ?? ""
      : user.role === "CLIENT"
      ? user.client?.id ?? ""
      : user.id;

  const token = signAccessToken(user.id, user.email, user.role, profileId);
  const refreshToken = await createRefreshToken(user.id);

  res.json({
    success: true,
    data: {
      token,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    },
  });
}

// POST /auth/refresh — intercambia refresh token por nuevo access token
export async function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json({ success: false, error: "refreshToken requerido" });
    return;
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });

  if (!stored || stored.expiresAt < new Date()) {
    if (stored) await prisma.refreshToken.delete({ where: { id: stored.id } });
    res.status(401).json({ success: false, error: "Refresh token inválido o expirado" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: stored.userId },
    include: { trainer: true, client: true },
  });

  if (!user) {
    res.status(401).json({ success: false, error: "Usuario no encontrado" });
    return;
  }

  const profileId =
    user.role === "TRAINER"
      ? user.trainer?.id ?? ""
      : user.role === "CLIENT"
      ? user.client?.id ?? ""
      : user.id;

  // Rotar el refresh token (buena práctica de seguridad)
  await prisma.refreshToken.delete({ where: { id: stored.id } });
  const newRefreshToken = await createRefreshToken(user.id);
  const newAccessToken = signAccessToken(user.id, user.email, user.role, profileId);

  res.json({
    success: true,
    data: { token: newAccessToken, refreshToken: newRefreshToken },
  });
}

// POST /auth/logout — invalida el refresh token
export async function logout(req: Request, res: Response) {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } }).catch(() => {});
  }
  res.json({ success: true });
}

// GET /auth/trainers — public list of trainers for registration
export async function listTrainers(req: Request, res: Response) {
  const trainers = await prisma.trainer.findMany({
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true } },
    },
    orderBy: { user: { name: "asc" } },
  });

  const result = trainers.map(t => ({
    id: t.id,
    name: t.user.name,
    email: t.user.email,
    avatar: t.user.avatar,
    specialty: t.specialty,
    bio: t.bio,
  }));

  res.json({ success: true, data: result });
}

export async function me(req: AuthRequest, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      trainer: { select: { id: true, bio: true, specialty: true } },
      client: {
        select: {
          id: true,
          goal: true,
          experience: true,
          equipment: true,
          weight: true,
          age: true,
          trainerId: true,
        },
      },
    },
  });

  if (!user) {
    res.status(404).json({ success: false, error: "Usuario no encontrado" });
    return;
  }

  res.json({ success: true, data: user });
}
