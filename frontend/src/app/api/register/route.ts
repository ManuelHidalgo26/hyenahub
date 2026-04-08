import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  role: z.enum(["TRAINER", "CLIENT"]),
  trainerId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password, name, role, trainerId } = parsed.data;

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json(
        { success: false, error: "Email ya registrado" },
        { status: 409 }
      );
    }

    if (role === "CLIENT" && !trainerId) {
      return NextResponse.json(
        { success: false, error: "trainerId es requerido para clientes" },
        { status: 400 }
      );
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

    return NextResponse.json(
      {
        success: true,
        data: {
          user: { id: user.id, email: user.email, name: user.name, role: user.role },
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/register]", err);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
