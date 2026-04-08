import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/server-auth";
import { pusherServer } from "@/lib/pusher";

// GET /api/messages/[otherUserId] — fetch conversation history, mark as read
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ otherUserId: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { otherUserId } = await params;
  const myId    = session!.user.id;
  const otherId = otherUserId;

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: myId,    receiverId: otherId },
        { senderId: otherId, receiverId: myId    },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  // Mark incoming unread messages as read
  await prisma.message.updateMany({
    where: { senderId: otherId, receiverId: myId, read: false },
    data:  { read: true },
  });

  return NextResponse.json({ success: true, data: messages });
}

// POST /api/messages/[otherUserId] — send a message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ otherUserId: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { otherUserId } = await params;
  const senderId   = session!.user.id;
  const receiverId = otherUserId;

  const body = await req.json();
  const { body: messageBody } = body as { body: string };

  if (!messageBody || typeof messageBody !== "string" || !messageBody.trim()) {
    return NextResponse.json({ success: false, error: "El mensaje no puede estar vacío" }, { status: 400 });
  }

  const msg = await prisma.message.create({
    data: { senderId, receiverId, body: messageBody.trim() },
  });

  await pusherServer.trigger(`private-user-${receiverId}`, "message.new", msg);
  await pusherServer.trigger(`private-user-${senderId}`,   "message.new", msg);

  return NextResponse.json({ success: true, data: msg }, { status: 201 });
}
