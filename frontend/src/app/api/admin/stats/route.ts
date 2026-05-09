import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 });
  }

  const [totalUsers, totalTrainers, totalClients, totalRoutines] = await Promise.all([
    prisma.user.count(),
    prisma.trainer.count(),
    prisma.client.count(),
    prisma.routine.count(),
  ]);

  return NextResponse.json({ success: true, data: { totalUsers, totalTrainers, totalClients, totalRoutines } });
}
