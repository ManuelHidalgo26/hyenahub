import { describe, it, expect, vi, beforeEach } from "vitest";
import supertest from "supertest";
import jwt from "jsonwebtoken";
import { createApp } from "../app";

vi.mock("../services/prisma.service", () => ({
  prisma: {
    client: { findFirst: vi.fn(), findUnique: vi.fn() },
    diet:   { create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn(), delete: vi.fn() },
    meal:   { deleteMany: vi.fn() },
  },
}));
vi.mock("../services/audit.service", () => ({ auditLog: vi.fn() }));

import { prisma } from "../services/prisma.service";

const app = createApp();
const JWT_SECRET = process.env.JWT_SECRET!;

const TRAINER_TOKEN = jwt.sign({ userId: "tu-1", email: "t@t.com", role: "TRAINER", profileId: "tp-1" }, JWT_SECRET, { expiresIn: "1h" });
const CLIENT_TOKEN  = jwt.sign({ userId: "cu-1", email: "c@c.com", role: "CLIENT",  profileId: "cp-1" }, JWT_SECRET, { expiresIn: "1h" });

const mockDiet = {
  id: "diet-1", clientId: "cp-1", trainerId: "tp-1", name: "Plan volumen",
  description: null, calories: 2500, protein: 180, carbs: 280, fat: 80,
  createdAt: new Date(),
  meals: [{ id: "m-1", dietId: "diet-1", name: "Desayuno", time: "08:00", foods: "Avena con leche", calories: 400, protein: 25, carbs: 60, fat: 8, notes: null, order: 0 }],
};

const validDietBody = {
  clientId: "cp-1",
  name: "Plan volumen",
  calories: 2500,
  meals: [{ name: "Desayuno", foods: "Avena con leche", calories: 400 }],
};

// ─── POST /api/diets ──────────────────────────────────────────────────────────
describe("POST /api/diets", () => {
  beforeEach(() => vi.clearAllMocks());

  it("crea una dieta para el cliente del trainer", async () => {
    vi.mocked(prisma.client.findFirst).mockResolvedValue({ id: "cp-1", userId: "cu-1", trainerId: "tp-1" } as never);
    vi.mocked(prisma.diet.create).mockResolvedValue(mockDiet as never);

    const res = await supertest(app)
      .post("/api/diets")
      .set("Authorization", `Bearer ${TRAINER_TOKEN}`)
      .send(validDietBody);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("Plan volumen");
  });

  it("rechaza si el cliente no pertenece al trainer", async () => {
    vi.mocked(prisma.client.findFirst).mockResolvedValue(null);

    const res = await supertest(app)
      .post("/api/diets")
      .set("Authorization", `Bearer ${TRAINER_TOKEN}`)
      .send(validDietBody);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("rechaza payload sin meals", async () => {
    const res = await supertest(app)
      .post("/api/diets")
      .set("Authorization", `Bearer ${TRAINER_TOKEN}`)
      .send({ clientId: "cp-1", name: "Sin comidas", meals: [] });

    expect(res.status).toBe(400);
  });

  it("rechaza si el rol es CLIENT", async () => {
    const res = await supertest(app)
      .post("/api/diets")
      .set("Authorization", `Bearer ${CLIENT_TOKEN}`)
      .send(validDietBody);
    expect(res.status).toBe(403);
  });
});

// ─── GET /api/diets/client/:clientId ─────────────────────────────────────────
describe("GET /api/diets/client/:clientId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve las dietas del cliente al trainer", async () => {
    vi.mocked(prisma.client.findFirst).mockResolvedValue({ id: "cp-1" } as never);
    vi.mocked(prisma.diet.findMany).mockResolvedValue([mockDiet] as never);

    const res = await supertest(app)
      .get("/api/diets/client/cp-1")
      .set("Authorization", `Bearer ${TRAINER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it("rechaza si el cliente no pertenece al trainer", async () => {
    vi.mocked(prisma.client.findFirst).mockResolvedValue(null);

    const res = await supertest(app)
      .get("/api/diets/client/cp-99")
      .set("Authorization", `Bearer ${TRAINER_TOKEN}`);

    expect(res.status).toBe(403);
  });
});

// ─── DELETE /api/diets/:dietId ────────────────────────────────────────────────
describe("DELETE /api/diets/:dietId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("elimina la dieta correctamente", async () => {
    vi.mocked(prisma.diet.findFirst).mockResolvedValue(mockDiet as never);
    vi.mocked(prisma.diet.delete).mockResolvedValue(mockDiet as never);

    const res = await supertest(app)
      .delete("/api/diets/diet-1")
      .set("Authorization", `Bearer ${TRAINER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(prisma.diet.delete).toHaveBeenCalledWith({ where: { id: "diet-1" } });
  });

  it("devuelve 403 si la dieta no le pertenece", async () => {
    vi.mocked(prisma.diet.findFirst).mockResolvedValue(null);

    const res = await supertest(app)
      .delete("/api/diets/diet-999")
      .set("Authorization", `Bearer ${TRAINER_TOKEN}`);

    expect(res.status).toBe(403);
  });
});

// ─── GET /api/diets/my (CLIENT) ───────────────────────────────────────────────
describe("GET /api/diets/my", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve las dietas del cliente autenticado", async () => {
    vi.mocked(prisma.diet.findMany).mockResolvedValue([mockDiet] as never);

    const res = await supertest(app)
      .get("/api/diets/my")
      .set("Authorization", `Bearer ${CLIENT_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe("Plan volumen");
  });

  it("devuelve lista vacía si no tiene dietas", async () => {
    vi.mocked(prisma.diet.findMany).mockResolvedValue([]);

    const res = await supertest(app)
      .get("/api/diets/my")
      .set("Authorization", `Bearer ${CLIENT_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });
});
