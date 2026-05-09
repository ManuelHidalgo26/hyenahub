import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { clientId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TRAINER") {
    return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 });
  }

  const client = await prisma.client.findFirst({
    where:   { id: params.clientId, trainerId: session.user.profileId },
    include: {
      user:     { select: { id: true, name: true, email: true, avatar: true } },
      routines: { orderBy: { weekStart: "desc" }, include: { exercises: { orderBy: { order: "asc" } }, feedback: true } },
    },
  });

  if (!client) return NextResponse.json({ success: false, error: "Cliente no encontrado" }, { status: 404 });
  return NextResponse.json({ success: true, data: client });
}

const updateSchema = z.object({
  goal:       z.string().optional(),
  experience: z.string().optional(),
  equipment:  z.string().optional(),
  weight:     z.number().optional(),
  age:        z.number().int().optional(),
  notes:      z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { clientId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TRAINER") {
    return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 });
  }

  const existing = await prisma.client.findFirst({
    where: { id: params.clientId, trainerId: session.user.profileId },
  });
  if (!existing) return NextResponse.json({ success: false, error: "Cliente no encontrado" }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });

  const client = await prisma.client.update({
    where: { id: params.clientId },
    data:  parsed.data,
  });

  return NextResponse.json({ success: true, data: client });
}
