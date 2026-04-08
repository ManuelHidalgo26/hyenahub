import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-auth";

// GET /api/trainer/clients — list all clients for the authenticated trainer
export async function GET() {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  try {
    const clients = await prisma.client.findMany({
      where: { trainerId: session!.user.profileId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        routines: {
          orderBy: { weekStart: "desc" },
          take: 1,
          include: {
            exercises: { select: { id: true, completed: true } },
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: clients });
  } catch (err) {
    console.error("[GET /api/trainer/clients]", err);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
