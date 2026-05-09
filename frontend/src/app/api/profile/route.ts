import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { id: true, name: true, email: true, avatar: true, role: true },
  });

  return NextResponse.json({ success: true, data: user });
}
