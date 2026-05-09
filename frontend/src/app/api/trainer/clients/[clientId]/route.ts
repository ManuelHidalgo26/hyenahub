import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { clientId: string } }) {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  const client = await prisma.client.findFirst({
    where: { id: params.clientId, trainerId: session!.user.profileId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      routines: {
        orderBy: { weekStart: "desc" },
        include: {
          exercises: { orderBy: { order: "asc" } },
          days: { orderBy: { order: "asc" }, include: { exercises: { orderBy: { order: "asc" } } } },
          feedback: true,
        },
      },
    },
  });

  if (!client) {
    return NextResponse.json({ success: false, error: "Cliente no encontrado" }, { status: 404 });
  }

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

export async function PATCH(req: NextRequest, { params }: { params: { clientId: string } }) {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const client = await prisma.client.findFirst({
    where: { id: params.clientId, trainerId: session!.user.profileId },
  });
  if (!client) {
    return NextResponse.json({ success: false, error: "Cliente no encontrado" }, { status: 404 });
  }

  const updated = await prisma.client.update({ where: { id: client.id }, data: parsed.data });
  return NextResponse.json({ success: true, data: updated });
}
