import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/server-auth";

// GET /api/messages?type=unread-count — total unread messages for current user
export async function GET(_req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const count = await prisma.message.count({
    where: { receiverId: session!.user.id, read: false },
  });

  return NextResponse.json({ success: true, data: { count } });
}
