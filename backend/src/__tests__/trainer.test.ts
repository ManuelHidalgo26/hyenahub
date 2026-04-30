import { describe, it, expect, vi, beforeEach } from "vitest";
import supertest from "supertest";
import jwt from "jsonwebtoken";
import { createApp } from "../app";

vi.mock("../services/prisma.service", () => ({
  prisma: {
    client:  { count: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    routine: { count: vi.fn() },
    exercise:{ count: vi.fn() },
  },
}));

import { prisma } from "../services/prisma.service";

const app = createApp();
const JWT_SECRET = process.env.JWT_SECRET!;

const TRAINER_TOKEN = jwt.sign({ userId: "tu-1", email: "t@t.com", role: "TRAINER", profileId: "tp-1" }, JWT_SECRET, { expiresIn: "1h" });
const CLIENT_TOKEN  = jwt.sign({ userId: "cu-1", email: "c@c.com", role: "CLIENT",  profileId: "cp-1" }, JWT_SECRET, { expiresIn: "1h" });

const mockClient = {
  id: "cp-1", goal: "Bajar de peso", experience: "beginner", equipment: "home",
  weight: 80, age: 30, notes: null, trainerId: "tp-1",
  user: { id: "cu-1", name: "Ana García", email: "ana@test.com" },
  routines: [],
};

// ─── GET /api/trainer/dashboard ──────────────────────────────────────────────
describe("GET /api/trainer/dashboard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve las estadísticas del trainer", async () => {
    vi.mocked(prisma.client.count).mockResolvedValue(5);
    vi.mocked(prisma.routine.count).mockResolvedValue(3);
    vi.mocked(prisma.exercise.count).mockResolvedValue(24);

    const res = await supertest(app)
      .get("/api/trainer/dashboard")
      .set("Authorization", `Bearer ${TRAINER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.data.totalClients).toBe(5);
    expect(res.body.data.thisWeekRoutines).toBe(3);
    expect(res.body.data.completedExercisesThisWeek).toBe(24);
  });

  it("rechaza acceso de CLIENT", async () => {
    const res = await supertest(app)
      .get("/api/trainer/dashboard")
      .set("Authorization", `Bearer ${CLIENT_TOKEN}`);
    expect(res.status).toBe(403);
  });
});

// ─── GET /api/trainer/clients ─────────────────────────────────────────────────
describe("GET /api/trainer/clients", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve la lista de clientes del trainer", async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValue([mockClient] as never);

    const res = await supertest(app)
      .get("/api/trainer/clients")
      .set("Authorization", `Bearer ${TRAINER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].user.name).toBe("Ana García");
  });

  it("devuelve lista vacía si no tiene clientes", async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValue([]);

    const res = await supertest(app)
      .get("/api/trainer/clients")
      .set("Authorization", `Bearer ${TRAINER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });
});

// ─── GET /api/trainer/clients/:id ────────────────────────────────────────────
describe("GET /api/trainer/clients/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve el detalle del cliente", async () => {
    vi.mocked(prisma.client.findFirst).mockResolvedValue(mockClient as never);

    const res = await supertest(app)
      .get("/api/trainer/clients/cp-1")
      .set("Authorization", `Bearer ${TRAINER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe("cp-1");
    expect(res.body.data.user.email).toBe("ana@test.com");
  });

  it("devuelve 404 si el cliente no existe o es de otro trainer", async () => {
    vi.mocked(prisma.client.findFirst).mockResolvedValue(null);

    const res = await supertest(app)
      .get("/api/trainer/clients/cp-999")
      .set("Authorization", `Bearer ${TRAINER_TOKEN}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// ─── PATCH /api/trainer/clients/:id ──────────────────────────────────────────
describe("PATCH /api/trainer/clients/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("actualiza el perfil del cliente correctamente", async () => {
    vi.mocked(prisma.client.findFirst).mockResolvedValue(mockClient as never);
    vi.mocked(prisma.client.update).mockResolvedValue({ ...mockClient, goal: "Ganar músculo", weight: 82 } as never);

    const res = await supertest(app)
      .patch("/api/trainer/clients/cp-1")
      .set("Authorization", `Bearer ${TRAINER_TOKEN}`)
      .send({ goal: "Ganar músculo", weight: 82 });

    expect(res.status).toBe(200);
    expect(res.body.data.goal).toBe("Ganar músculo");
    expect(res.body.data.weight).toBe(82);
  });

  it("devuelve 404 si el cliente no pertenece al trainer", async () => {
    vi.mocked(prisma.client.findFirst).mockResolvedValue(null);

    const res = await supertest(app)
      .patch("/api/trainer/clients/cp-999")
      .set("Authorization", `Bearer ${TRAINER_TOKEN}`)
      .send({ goal: "Nuevo objetivo" });

    expect(res.status).toBe(404);
  });
});
