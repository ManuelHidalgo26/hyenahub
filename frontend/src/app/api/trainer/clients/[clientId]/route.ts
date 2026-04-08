import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-auth";

const updateClientSchema = z.object({
  goal: z.string().optional(),
  experience: z.string().optional(),
  equipment: z.string().optional(),
  weight: z.number().optional(),
  age: z.number().int().optional(),
  notes: z.string().optional(),
});

// GET /api/trainer/clients/[clientId] — client detail
export async function GET(
  _req: NextRequest,
  { params }: { params: { clientId: string } }
) {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  try {
    const client = await prisma.client.findFirst({
      where: {
        id: params.clientId,
        trainerId: session!.user.profileId,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        routines: {
          orderBy: { weekStart: "desc" },
          include: { exercises: true },
        },
      },
    });

    if (!client) {
      return NextResponse.json(
        { success: false, error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: client });
  } catch (err) {
    console.error("[GET /api/trainer/clients/[clientId]]", err);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// PATCH /api/trainer/clients/[clientId] — update client profile
export async function PATCH(
  req: NextRequest,
  { params }: { params: { clientId: string } }
) {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = updateClientSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Verify ownership
    const client = await prisma.client.findFirst({
      where: { id: params.clientId, trainerId: session!.user.profileId },
    });

    if (!client) {
      return NextResponse.json(
        { success: false, error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    const updated = await prisma.client.update({
      where: { id: client.id },
      data: parsed.data,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("[PATCH /api/trainer/clients/[clientId]]", err);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
