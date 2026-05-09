import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const count = await prisma.message.count({
    where: {
      receiverId: session!.user.id,
      read:       false,
    },
  });

  return NextResponse.json({ success: true, data: { count } });
}
