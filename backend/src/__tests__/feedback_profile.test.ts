import { describe, it, expect, vi, beforeEach } from "vitest";
import supertest from "supertest";
import jwt from "jsonwebtoken";
import { createApp } from "../app";

vi.mock("../services/prisma.service", () => ({
  prisma: {
    routine:        { findFirst: vi.fn() },
    weeklyFeedback: { upsert: vi.fn(), findUnique: vi.fn() },
    user:           { update: vi.fn(), findUnique: vi.fn() },
    client:         { findUnique: vi.fn() },
  },
}));

import { prisma } from "../services/prisma.service";

const app = createApp();
const JWT_SECRET = process.env.JWT_SECRET!;

const CLIENT_TOKEN  = jwt.sign({ userId: "cu-1", email: "c@c.com", role: "CLIENT",  profileId: "cp-1" }, JWT_SECRET, { expiresIn: "1h" });
const TRAINER_TOKEN = jwt.sign({ userId: "tu-1", email: "t@t.com", role: "TRAINER", profileId: "tp-1" }, JWT_SECRET, { expiresIn: "1h" });

const mockFeedback = { id: "fb-1", routineId: "r-1", clientId: "cp-1", rating: 4, comment: "Muy buena sesión" };

// ─── POST /api/feedback/:routineId ────────────────────────────────────────────
describe("POST /api/feedback/:routineId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("guarda el feedback del cliente para su rutina", async () => {
    vi.mocked(prisma.routine.findFirst).mockResolvedValue({ id: "r-1", clientId: "cp-1" } as never);
    vi.mocked(prisma.weeklyFeedback.upsert).mockResolvedValue(mockFeedback as never);

    const res = await supertest(app)
      .post("/api/feedback/r-1")
      .set("Authorization", `Bearer ${CLIENT_TOKEN}`)
      .send({ rating: 4, comment: "Muy buena sesión" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.rating).toBe(4);
    expect(res.body.data.comment).toBe("Muy buena sesión");
  });

  it("también permite enviar feedback sin comentario", async () => {
    vi.mocked(prisma.routine.findFirst).mockResolvedValue({ id: "r-1", clientId: "cp-1" } as never);
    vi.mocked(prisma.weeklyFeedback.upsert).mockResolvedValue({ ...mockFeedback, rating: 5, comment: null } as never);

    const res = await supertest(app)
      .post("/api/feedback/r-1")
      .set("Authorization", `Bearer ${CLIENT_TOKEN}`)
      .send({ rating: 5 });

    expect(res.status).toBe(200);
    expect(res.body.data.rating).toBe(5);
    expect(res.body.data.comment).toBeNull();
  });

  it("devuelve 404 si la rutina no es del cliente", async () => {
    vi.mocked(prisma.routine.findFirst).mockResolvedValue(null);

    const res = await supertest(app)
      .post("/api/feedback/r-999")
      .set("Authorization", `Bearer ${CLIENT_TOKEN}`)
      .send({ rating: 3 });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("rechaza rating fuera de rango (0 o 6)", async () => {
    const res = await supertest(app)
      .post("/api/feedback/r-1")
      .set("Authorization", `Bearer ${CLIENT_TOKEN}`)
      .send({ rating: 6 });

    expect(res.status).toBe(400);
  });

  it("rechaza si el rol es TRAINER", async () => {
    const res = await supertest(app)
      .post("/api/feedback/r-1")
      .set("Authorization", `Bearer ${TRAINER_TOKEN}`)
      .send({ rating: 4 });
    expect(res.status).toBe(403);
  });
});

// ─── GET /api/feedback/routine/:routineId ────────────────────────────────────
describe("GET /api/feedback/routine/:routineId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve el feedback de una rutina", async () => {
    vi.mocked(prisma.weeklyFeedback.findUnique).mockResolvedValue(mockFeedback as never);

    const res = await supertest(app)
      .get("/api/feedback/routine/r-1")
      .set("Authorization", `Bearer ${TRAINER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.data.rating).toBe(4);
  });

  it("devuelve null si la rutina no tiene feedback", async () => {
    vi.mocked(prisma.weeklyFeedback.findUnique).mockResolvedValue(null);

    const res = await supertest(app)
      .get("/api/feedback/routine/r-sin-feedback")
      .set("Authorization", `Bearer ${TRAINER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });
});

// ─── GET /api/profile/me ─────────────────────────────────────────────────────
describe("GET /api/profile/me", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve el perfil del usuario autenticado", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "cu-1", name: "Ana García", email: "c@c.com", avatar: null, role: "CLIENT",
    } as never);

    const res = await supertest(app)
      .get("/api/profile/me")
      .set("Authorization", `Bearer ${CLIENT_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Ana García");
    expect(res.body.data.role).toBe("CLIENT");
  });
});

// ─── PATCH /api/profile/avatar ───────────────────────────────────────────────
describe("PATCH /api/profile/avatar", () => {
  beforeEach(() => vi.clearAllMocks());

  it("actualiza avatar con URL válida", async () => {
    vi.mocked(prisma.user.update).mockResolvedValue({
      id: "cu-1", name: "Ana", email: "c@c.com", avatar: "https://example.com/avatar.jpg", role: "CLIENT",
    } as never);

    const res = await supertest(app)
      .patch("/api/profile/avatar")
      .set("Authorization", `Bearer ${CLIENT_TOKEN}`)
      .send({ avatar: "https://example.com/avatar.jpg" });

    expect(res.status).toBe(200);
    expect(res.body.data.avatar).toBe("https://example.com/avatar.jpg");
  });

  it("borra el avatar si se envía string vacío", async () => {
    vi.mocked(prisma.user.update).mockResolvedValue({
      id: "cu-1", name: "Ana", email: "c@c.com", avatar: null, role: "CLIENT",
    } as never);

    const res = await supertest(app)
      .patch("/api/profile/avatar")
      .set("Authorization", `Bearer ${CLIENT_TOKEN}`)
      .send({ avatar: "" });

    expect(res.status).toBe(200);
    expect(res.body.data.avatar).toBeNull();
  });

  it("rechaza string que no es URL ni base64 de imagen", async () => {
    // "not-a-valid-url" no pasa z.string().url(), no es literal(""), y no empieza con data:image/
    const res = await supertest(app)
      .patch("/api/profile/avatar")
      .set("Authorization", `Bearer ${CLIENT_TOKEN}`)
      .send({ avatar: "not-a-valid-url" });

    expect(res.status).toBe(400);
  });
});
