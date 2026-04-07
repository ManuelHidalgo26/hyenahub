import { Response } from "express";
import { prisma } from "../services/prisma.service";
import { AuthRequest } from "../types";

// GET /messages/:otherUserId — fetch conversation history, mark as read
export async function getConversation(req: AuthRequest, res: Response) {
  const myId    = req.user!.userId;
  const otherId = req.params.otherUserId;

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

// GET /messages/unread-count — total unread messages for current user
export async function getUnreadCount(req: AuthRequest, res: Response) {
  const count = await prisma.message.count({
    where: { receiverId: req.user!.userId, read: false },
  });
  res.json({ success: true, data: { count } });
}
