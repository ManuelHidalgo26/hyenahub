import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";
import jwt from "jsonwebtoken";
import { prisma } from "../services/prisma.service";
import logger from "../services/logger.service";
import { JwtPayload } from "../types";

const socketLogger = logger.child({ module: "socket" });

export let io: SocketIOServer;

export async function initSocket(httpServer: HttpServer, frontendUrl: string) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: frontendUrl,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  if (process.env.REDIS_URL) {
    try {
      const pubClient = new Redis(process.env.REDIS_URL);
      const subClient = pubClient.duplicate();
      await Promise.all([
        new Promise<void>((res, rej) => pubClient.once("ready", res).once("error", rej)),
        new Promise<void>((res, rej) => subClient.once("ready", res).once("error", rej)),
      ]);
      io.adapter(createAdapter(pubClient, subClient));
      socketLogger.info("Socket.io using Redis adapter");
    } catch (err) {
      socketLogger.warn({ err }, "Redis adapter unavailable, falling back to in-memory");
    }
  } else {
    socketLogger.info("Socket.io using in-memory adapter");
  }

  const userSockets = new Map<string, string>();

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next();
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
      (socket as unknown as { user: JwtPayload }).user = payload;
      next();
    } catch {
      next();
    }
  });

  io.on("connection", (socket) => {
    socketLogger.debug({ socketId: socket.id }, "Socket connected");

    socket.on("register", (userId: string) => {
      const socketUser = (socket as unknown as { user?: JwtPayload }).user;
      if (socketUser && socketUser.userId !== userId) {
        socketLogger.warn(
          { jwtUserId: socketUser.userId, claimedUserId: userId },
          "Socket register mismatch — rejected"
        );
        return;
      }
      userSockets.set(userId, socket.id);
      socket.join(`user:${userId}`);
      socketLogger.debug({ userId, socketId: socket.id }, "User registered to socket");
    });

    socket.on(
      "exercise:complete",
      async (data: { exerciseId: string; routineId: string; trainerId: string }) => {
        try {
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
          socketLogger.error({ err, data }, "exercise:complete error");
        }
      }
    );

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
          socketLogger.error({ err, data }, "session:complete error");
        }
      }
    );

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

          io.to(`user:${data.senderId}`).emit("chat:message", msg);
          io.to(`user:${data.receiverId}`).emit("chat:message", msg);
        } catch (err) {
          socketLogger.error({ err }, "chat:send error");
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
      socketLogger.debug({ socketId: socket.id }, "Socket disconnected");
    });
  });

  return io;
}

export function emitToUser(userId: string, event: string, data: unknown) {
  io?.to(`user:${userId}`).emit(event, data);
}
