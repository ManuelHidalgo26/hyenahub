import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-auth";

// GET /api/admin/trainers
export async function GET() {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const trainers = await prisma.trainer.findMany({
    include: {
      user:   { select: { id: true, name: true, email: true, createdAt: true } },
      _count: { select: { clients: true } },
    },
  });

  return NextResponse.json({ success: true, data: trainers });
}
