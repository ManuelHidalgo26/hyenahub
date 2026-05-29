import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const RegisterSchema = z.object({
  name:       z.string().min(2).max(100),
  email:      z.string().email().max(255),
  password:   z.string().min(6),
  role:       z.enum(["TRAINER", "CLIENT"]),
  trainerId:  z.string().optional(),
  goal:       z.string().optional(),
  experience: z.string().optional(),
  equipment:  z.string().optional(),
});

export async function POST(req: NextRequest) {
  // Rate limit: 5 registros por IP cada 10 minutos.
  const rl = checkRateLimit(`register:${getClientIp(req)}`, 5, 10 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { success: false, error: "Demasiados intentos. Intentá de nuevo más tarde." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const body = await req.json().catch(() => null);
  const result = RegisterSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { name, email, password, role, trainerId, goal, experience, equipment } = result.data;

  if (role === "CLIENT" && !trainerId) {
    return NextResponse.json(
      { success: false, error: { trainerId: ["El trainerId es requerido para clientes"] } },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { success: false, error: { email: ["Este email ya está registrado"] } },
      { status: 409 }
    );
  }

  if (role === "CLIENT" && trainerId) {
    const trainer = await prisma.trainer.findUnique({ where: { id: trainerId } });
    if (!trainer) {
      return NextResponse.json(
        { success: false, error: { trainerId: ["Entrenador no encontrado"] } },
        { status: 404 }
      );
    }
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role,
      ...(role === "TRAINER" && {
        trainer: { create: {} },
      }),
      ...(role === "CLIENT" && trainerId && {
        client: {
          create: {
            trainerId,
            goal:       goal       ?? "",
            experience: experience ?? "",
            equipment:  equipment  ?? "",
          },
        },
      }),
    },
    include: { trainer: true, client: true },
  });

  return NextResponse.json(
    {
      success: true,
      data: {
        id:    user.id,
        name:  user.name,
        email: user.email,
        role:  user.role,
      },
    },
    { status: 201 }
  );
}
