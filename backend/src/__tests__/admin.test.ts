import { describe, it, expect, vi, beforeEach } from "vitest";
import supertest from "supertest";
import jwt from "jsonwebtoken";
import { createApp } from "../app";

vi.mock("../services/prisma.service", () => ({
  prisma: {
    user:    { count: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
    trainer: { count: vi.fn(), findMany: vi.fn() },
    client:  { count: vi.fn() },
    routine: { count: vi.fn() },
    exercise:{ count: vi.fn() },
  },
}));
vi.mock("../services/audit.service", () => ({ auditLog: vi.fn() }));

import { prisma } from "../services/prisma.service";

const app = createApp();
const JWT_SECRET = process.env.JWT_SECRET!;

const ADMIN_TOKEN  = jwt.sign({ userId: "admin-1", email: "a@a.com", role: "ADMIN",   profileId: "admin-1"   }, JWT_SECRET, { expiresIn: "1h" });
const TRAINER_TOKEN = jwt.sign({ userId: "t-1",    email: "t@t.com", role: "TRAINER", profileId: "tp-1"     }, JWT_SECRET, { expiresIn: "1h" });

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────
describe("GET /api/admin/stats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve todas las estadísticas globales", async () => {
    vi.mocked(prisma.user.count).mockResolvedValue(10);
    vi.mocked(prisma.trainer.count).mockResolvedValue(3);
    vi.mocked(prisma.client.count).mockResolvedValue(7);
    vi.mocked(prisma.routine.count).mockResolvedValue(20);
    vi.mocked(prisma.exercise.count).mockResolvedValue(150);

    const res = await supertest(app)
      .get("/api/admin/stats")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalUsers).toBe(10);
    expect(res.body.data.totalTrainers).toBe(3);
    expect(res.body.data.totalClients).toBe(7);
    expect(res.body.data.totalRoutines).toBe(20);
    expect(res.body.data.completedExercises).toBe(150);
    expect(res.body.data.newUsersLast30).toBeDefined();
  });

  it("rechaza acceso de TRAINER", async () => {
    const res = await supertest(app)
      .get("/api/admin/stats")
      .set("Authorization", `Bearer ${TRAINER_TOKEN}`);
    expect(res.status).toBe(403);
  });
});

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
describe("GET /api/admin/users", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve la lista completa de usuarios", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: "u-1", name: "Carlos", email: "c@c.com", role: "TRAINER", createdAt: new Date() } as never,
      { id: "u-2", name: "Ana",    email: "a@a.com", role: "CLIENT",  createdAt: new Date() } as never,
    ]);

    const res = await supertest(app)
      .get("/api/admin/users")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].name).toBe("Carlos");
  });
});

// ─── DELETE /api/admin/users/:id ─────────────────────────────────────────────
describe("DELETE /api/admin/users/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("elimina un usuario existente correctamente", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "u-target", email: "victim@test.com", role: "CLIENT", name: "Víctima",
    } as never);
    vi.mocked(prisma.user.delete).mockResolvedValue({} as never);

    const res = await supertest(app)
      .delete("/api/admin/users/u-target")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: "u-target" } });
  });

  it("devuelve 404 si el usuario no existe", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const res = await supertest(app)
      .delete("/api/admin/users/ghost-id")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("rechaza acceso de TRAINER a DELETE", async () => {
    const res = await supertest(app)
      .delete("/api/admin/users/u-1")
      .set("Authorization", `Bearer ${TRAINER_TOKEN}`);
    expect(res.status).toBe(403);
  });
});
