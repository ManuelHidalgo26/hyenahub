import { describe, it, expect, vi, beforeEach } from "vitest";
import supertest from "supertest";
import jwt from "jsonwebtoken";
import { createApp } from "../app";

vi.mock("../services/prisma.service", () => ({
  prisma: {
    message: {
      findMany:    vi.fn(),
      updateMany:  vi.fn(),
      count:       vi.fn(),
    },
  },
}));

import { prisma } from "../services/prisma.service";

const app = createApp();
const JWT_SECRET = process.env.JWT_SECRET!;

const CLIENT_TOKEN  = jwt.sign({ userId: "cu-1", email: "c@c.com", role: "CLIENT",  profileId: "cp-1" }, JWT_SECRET, { expiresIn: "1h" });
const TRAINER_TOKEN = jwt.sign({ userId: "tu-1", email: "t@t.com", role: "TRAINER", profileId: "tp-1" }, JWT_SECRET, { expiresIn: "1h" });

const mockMessages = [
  { id: "msg-1", senderId: "tu-1", receiverId: "cu-1", body: "Hola Ana!", read: true,  createdAt: new Date("2026-04-28T10:00:00Z") },
  { id: "msg-2", senderId: "cu-1", receiverId: "tu-1", body: "Hola profe!", read: false, createdAt: new Date("2026-04-28T10:01:00Z") },
];

// ─── GET /api/messages/unread-count ──────────────────────────────────────────
describe("GET /api/messages/unread-count", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve el conteo de mensajes no leídos", async () => {
    vi.mocked(prisma.message.count).mockResolvedValue(3);

    const res = await supertest(app)
      .get("/api/messages/unread-count")
      .set("Authorization", `Bearer ${CLIENT_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.count).toBe(3);
  });

  it("devuelve 0 si no hay mensajes no leídos", async () => {
    vi.mocked(prisma.message.count).mockResolvedValue(0);

    const res = await supertest(app)
      .get("/api/messages/unread-count")
      .set("Authorization", `Bearer ${TRAINER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.data.count).toBe(0);
  });

  it("rechaza sin autenticación", async () => {
    const res = await supertest(app).get("/api/messages/unread-count");
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/messages/:otherUserId ──────────────────────────────────────────
describe("GET /api/messages/:otherUserId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve la conversación y marca mensajes como leídos", async () => {
    vi.mocked(prisma.message.findMany).mockResolvedValue(mockMessages as never);
    vi.mocked(prisma.message.updateMany).mockResolvedValue({ count: 1 } as never);

    const res = await supertest(app)
      .get("/api/messages/tu-1")
      .set("Authorization", `Bearer ${CLIENT_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    // Verifica que se llama updateMany para marcar como leídos
    expect(prisma.message.updateMany).toHaveBeenCalledWith({
      where: { senderId: "tu-1", receiverId: "cu-1", read: false },
      data:  { read: true },
    });
  });

  it("devuelve conversación vacía si no hay mensajes", async () => {
    vi.mocked(prisma.message.findMany).mockResolvedValue([]);
    vi.mocked(prisma.message.updateMany).mockResolvedValue({ count: 0 } as never);

    const res = await supertest(app)
      .get("/api/messages/tu-1")
      .set("Authorization", `Bearer ${CLIENT_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it("requiere autenticación", async () => {
    const res = await supertest(app).get("/api/messages/tu-1");
    expect(res.status).toBe(401);
  });
});
