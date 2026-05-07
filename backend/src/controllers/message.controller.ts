import { Response } from "express";
import { z } from "zod";
import { prisma } from "../services/prisma.service";
import { AuthRequest } from "../types";
import { pusher } from "../services/pusher.service";

// GET /messages/:otherUserId — fetch conversation history, mark as read
export async function getConversation(req: AuthRequest, res: Response) {
  const myId    = req.user!.userId;
  const otherId = req.params.otherUserId as string;

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
    data: { read: true },
  });

  res.json({ success: true, data: messages });
}

// POST /messages/:otherUserId — send a message, trigger Pusher
export async function sendMessage(req: AuthRequest, res: Response) {
  const bodySchema = z.object({ body: z.string().min(1).max(2000) });
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const senderId    = req.user!.userId;
  const receiverId  = req.params.otherUserId as string;

  const message = await prisma.message.create({
    data: { senderId, receiverId, body: parsed.data.body },
  });

  // Notify both parties via Pusher
  pusher.trigger(
    [`private-user-${receiverId}`, `private-user-${senderId}`],
    "message.new",
    message
  ).catch(() => {});

  res.status(201).json({ success: true, data: message });
}

// GET /messages/unread-count — total unread messages for current user
export async function getUnreadCount(req: AuthRequest, res: Response) {
  const count = await prisma.message.count({
    where: { receiverId: req.user!.userId, read: false },
  });
  res.json({ success: true, data: { count } });
}
