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

const ROUTINES_PAGE_SIZE = 10;

// GET /api/trainer/clients/[clientId] — client detail with first page of routines
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  const { clientId } = await params;

  try {
    const [client, routinesRaw] = await Promise.all([
      prisma.client.findFirst({
        where: { id: clientId, trainerId: session!.user.profileId },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      prisma.routine.findMany({
        where: { clientId },
        orderBy: { weekStart: "desc" },
        take: ROUTINES_PAGE_SIZE + 1,
        include: { exercises: { orderBy: { order: "asc" } }, feedback: true },
      }),
    ]);

    if (!client) {
      return NextResponse.json(
        { success: false, error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    const hasMore = routinesRaw.length > ROUTINES_PAGE_SIZE;
    const routines = hasMore ? routinesRaw.slice(0, ROUTINES_PAGE_SIZE) : routinesRaw;
    const routinesNextCursor = hasMore ? routines[routines.length - 1].id : null;

    return NextResponse.json({
      success: true,
      data: { ...client, routines },
      routinesNextCursor,
    });
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
