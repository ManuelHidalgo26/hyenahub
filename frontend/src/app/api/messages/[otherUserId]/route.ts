import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { otherUserId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
  }

  const myId = session.user.id;
  const otherId = params.otherUserId;

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: myId, receiverId: otherId },
        { senderId: otherId, receiverId: myId },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  await prisma.message.updateMany({
    where: { senderId: otherId, receiverId: myId, read: false },
    data:  { read: true },
  });

  return NextResponse.json({ success: true, data: messages });
}

const sendSchema = z.object({ body: z.string().min(1).max(2000) });

export async function POST(
  req: NextRequest,
  { params }: { params: { otherUserId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const message = await prisma.message.create({
    data: {
      senderId:   session.user.id,
      receiverId: params.otherUserId,
      body:       parsed.data.body,
    },
  });

  await pusherServer
    .trigger(`private-user-${params.otherUserId}`, "message.new", {
      messageId: message.id,
      senderId:  session.user.id,
      body:      message.body,
      createdAt: message.createdAt,
    })
    .catch(() => {});

  return NextResponse.json({ success: true, data: message }, { status: 201 });
}
