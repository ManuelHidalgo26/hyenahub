import { NextResponse } from "next/server";
import { requireRole } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, error } = await requireRole("TRAINER");
  if (error) return error;

  const clients = await prisma.client.findMany({
    where: { trainerId: session!.user.profileId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      routines: {
        orderBy: { weekStart: "desc" },
        take: 1,
        include: { exercises: { select: { id: true, completed: true } } },
      },
    },
  });

  return NextResponse.json({ success: true, data: clients });
}
