import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { otherUserId: string } }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const myId    = session!.user.id;
  const otherId = params.otherUserId;

  const [messages] = await Promise.all([
    prisma.message.findMany({
      where: {
        OR: [
          { senderId: myId,    receiverId: otherId },
          { senderId: otherId, receiverId: myId    },
        ],
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.message.updateMany({
      where: { senderId: otherId, receiverId: myId, read: false },
      data:  { read: true },
    }),
  ]);

  return NextResponse.json({ success: true, data: messages });
}

const sendSchema = z.object({
  body: z.string().min(1).max(2000),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { otherUserId: string } }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const myId    = session!.user.id;
  const otherId = params.otherUserId;

  const other = await prisma.user.findUnique({ where: { id: otherId }, select: { id: true } });
  if (!other) {
    return NextResponse.json({ success: false, error: "Usuario no encontrado" }, { status: 404 });
  }

  const message = await prisma.message.create({
    data: { senderId: myId, receiverId: otherId, body: parsed.data.body },
  });

  await pusherServer.trigger(`private-user-${otherId}`, "message:new", {
    message,
  }).catch(() => {});

  return NextResponse.json({ success: true, data: message }, { status: 201 });
}
