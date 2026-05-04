import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";
import jwt from "jsonwebtoken";
import { prisma } from "../services/prisma.service";
import { JwtPayload } from "../types";

export let io: SocketIOServer;

export async function initSocket(httpServer: HttpServer, allowedOrigins: string | string[]) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Use Redis adapter when REDIS_URL is set (production/staging)
  // Falls back to in-memory adapter for local dev
  if (process.env.REDIS_URL) {
    try {
      const pubClient = new Redis(process.env.REDIS_URL);
      const subClient = pubClient.duplicate();
      await Promise.all([
        new Promise<void>((res, rej) => pubClient.once("ready", res).once("error", rej)),
        new Promise<void>((res, rej) => subClient.once("ready", res).once("error", rej)),
      ]);
      io.adapter(createAdapter(pubClient, subClient));
      console.log("Socket.io using Redis adapter");
    } catch (err) {
      console.warn("Redis adapter unavailable, falling back to in-memory:", err);
    }
  } else {
    console.log("Socket.io using in-memory adapter (set REDIS_URL to enable Redis)");
  }

  // Map userId → socketId for targeted notifications
  const userSockets = new Map<string, string>();

  // ── JWT authentication middleware for socket connections ──────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      // Allow unauthenticated connections (they won't be able to register)
      return next();
    }
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
      (socket as unknown as { user: JwtPayload }).user = payload;
      next();
    } catch {
      // Invalid token — still allow connection but mark as unauthenticated
      next();
    }
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Register: validate that the userId matches the JWT payload
    socket.on("register", (userId: string) => {
      const socketUser = (socket as unknown as { user?: JwtPayload }).user;
      // If JWT was provided, verify the registered userId matches it
      if (socketUser && socketUser.userId !== userId) {
        console.warn(`Socket register mismatch: JWT userId=${socketUser.userId}, claimed=${userId}`);
        return; // reject spoofed registration
      }
      userSockets.set(userId, socket.id);
      socket.join(`user:${userId}`);
      console.log(`User ${userId} registered to socket ${socket.id}`);
    });

    // Client marks an exercise as completed
    // trainerId here is the Trainer profile id (not userId)
    socket.on(
      "exercise:complete",
      async (data: { exerciseId: string; routineId: string; trainerId: string }) => {
        try {
          // Look up the trainer's userId from their profile id
          const trainer = await prisma.trainer.findUnique({
            where: { id: data.trainerId },
            select: { userId: true },
          });
          if (!trainer) return;

          io.to(`user:${trainer.userId}`).emit("exercise:completed", {
            exerciseId: data.exerciseId,
            routineId: data.routineId,
          });
        } catch (err) {
          console.error("exercise:complete socket error:", err);
        }
      }
    );

    // Client completes full session
    // trainerId here is the Trainer profile id (not userId)
    socket.on(
      "session:complete",
      async (data: { clientId: string; clientName: string; trainerId: string }) => {
        try {
          const trainer = await prisma.trainer.findUnique({
            where: { id: data.trainerId },
            select: { userId: true },
          });
          if (!trainer) return;

          io.to(`user:${trainer.userId}`).emit("session:completed", {
            clientId:   data.clientId,
            clientName: data.clientName,
            message:    `${data.clientName} completó su sesión de hoy 💪`,
          });
        } catch (err) {
          console.error("session:complete socket error:", err);
        }
      }
    );

    // Direct message: save to DB + emit to recipient
    socket.on(
      "chat:send",
      async (data: { senderId: string; receiverId: string; body: string }) => {
        try {
          const socketUser = (socket as unknown as { user?: JwtPayload }).user;
          if (!socketUser || socketUser.userId !== data.senderId) return;
          if (!data.body?.trim()) return;

          const msg = await prisma.message.create({
            data: {
              senderId:   data.senderId,
              receiverId: data.receiverId,
              body:       data.body.trim(),
            },
          });

          // Send to both sender (confirmation) and receiver (new message)
          io.to(`user:${data.senderId}`).emit("chat:message", msg);
          io.to(`user:${data.receiverId}`).emit("chat:message", msg);
        } catch (err) {
          console.error("chat:send socket error:", err);
        }
      }
    );

    socket.on("disconnect", () => {
      for (const [userId, socketId] of userSockets.entries()) {
        if (socketId === socket.id) {
          userSockets.delete(userId);
          break;
        }
      }
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

// Helper to emit to a specific user from anywhere in the app
export function emitToUser(userId: string, event: string, data: unknown) {
  io?.to(`user:${userId}`).emit(event, data);
}
