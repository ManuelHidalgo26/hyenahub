import { describe, it, expect, vi, beforeEach } from "vitest";
import supertest from "supertest";
import bcrypt from "bcryptjs";
import { createApp } from "../app";

// ─── Prisma mock ─────────────────────────────────────────────────────────────
vi.mock("../services/prisma.service", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    trainer: { findMany: vi.fn() },
  },
}));

import { prisma } from "../services/prisma.service";
const mockUser = vi.mocked(prisma.user);
const mockRefresh = vi.mocked(prisma.refreshToken);

const app = createApp();

// ─── POST /api/auth/register ─────────────────────────────────────────────────
describe("POST /api/auth/register", () => {
  beforeEach(() => vi.clearAllMocks());

  it("registra un TRAINER correctamente", async () => {
    mockUser.findUnique.mockResolvedValue(null);
    mockUser.create.mockResolvedValue({
      id: "user-1", email: "trainer@test.com", name: "Carlos", role: "TRAINER",
      password: "hashed", avatar: null, createdAt: new Date(), updatedAt: new Date(),
      trainer: { id: "trainer-1" }, client: null,
    } as never);
    mockRefresh.create.mockResolvedValue({ id: "rt-1", token: "rt-token", userId: "user-1", expiresAt: new Date(), createdAt: new Date() } as never);

    const res = await supertest(app).post("/api/auth/register").send({
      name: "Carlos", email: "trainer@test.com", password: "Pass123!", role: "TRAINER",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe("TRAINER");
  });

  it("registra un CLIENT con trainerId correcto", async () => {
    mockUser.findUnique.mockResolvedValue(null);
    mockUser.create.mockResolvedValue({
      id: "user-2", email: "client@test.com", name: "Ana", role: "CLIENT",
      password: "hashed", avatar: null, createdAt: new Date(), updatedAt: new Date(),
      trainer: null, client: { id: "client-1" },
    } as never);
    mockRefresh.create.mockResolvedValue({ id: "rt-2", token: "rt-token-2", userId: "user-2", expiresAt: new Date(), createdAt: new Date() } as never);

    const res = await supertest(app).post("/api/auth/register").send({
      name: "Ana", email: "client@test.com", password: "Pass123!", role: "CLIENT", trainerId: "trainer-1",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe("CLIENT");
  });

  it("rechaza si el email ya existe", async () => {
    mockUser.findUnique.mockResolvedValue({ id: "existing" } as never);

    const res = await supertest(app).post("/api/auth/register").send({
      name: "Otro", email: "exists@test.com", password: "Pass123!", role: "TRAINER",
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it("rechaza CLIENT sin trainerId", async () => {
    mockUser.findUnique.mockResolvedValue(null);

    const res = await supertest(app).post("/api/auth/register").send({
      name: "Sin trainer", email: "notrainer@test.com", password: "Pass123!", role: "CLIENT",
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rechaza payload inválido (email mal formado)", async () => {
    const res = await supertest(app).post("/api/auth/register").send({
      name: "x", email: "not-an-email", password: "Pass123!", role: "TRAINER",
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ─── POST /api/auth/login ────────────────────────────────────────────────────
describe("POST /api/auth/login", () => {
  const hashedPassword = bcrypt.hashSync("Correct1!", 1);

  beforeEach(() => vi.clearAllMocks());

  it("hace login con credenciales correctas", async () => {
    mockUser.findUnique.mockResolvedValue({
      id: "user-1", email: "user@test.com", name: "Test", role: "TRAINER",
      password: hashedPassword, avatar: null, createdAt: new Date(), updatedAt: new Date(),
      trainer: { id: "trainer-1" }, client: null,
    } as never);
    mockRefresh.create.mockResolvedValue({ id: "rt-1", token: "rt", userId: "user-1", expiresAt: new Date(), createdAt: new Date() } as never);

    const res = await supertest(app).post("/api/auth/login").send({
      email: "user@test.com", password: "Correct1!",
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });

  it("rechaza contraseña incorrecta", async () => {
    mockUser.findUnique.mockResolvedValue({
      id: "user-1", email: "user@test.com", name: "Test", role: "TRAINER",
      password: hashedPassword, avatar: null, createdAt: new Date(), updatedAt: new Date(),
      trainer: { id: "trainer-1" }, client: null,
    } as never);

    const res = await supertest(app).post("/api/auth/login").send({
      email: "user@test.com", password: "WrongPass1!",
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("rechaza usuario inexistente", async () => {
    mockUser.findUnique.mockResolvedValue(null);

    const res = await supertest(app).post("/api/auth/login").send({
      email: "nobody@test.com", password: "Pass123!",
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("rechaza payload sin email", async () => {
    const res = await supertest(app).post("/api/auth/login").send({ password: "Pass123!" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ─── GET /api/auth/trainers ──────────────────────────────────────────────────
describe("GET /api/auth/trainers", () => {
  it("devuelve la lista pública de entrenadores", async () => {
    vi.mocked(prisma.trainer.findMany).mockResolvedValue([
      { id: "t-1", user: { id: "u-1", name: "Carlos", email: "c@c.com", avatar: null }, specialty: "Fuerza", bio: null } as never,
    ]);

    const res = await supertest(app).get("/api/auth/trainers");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe("Carlos");
  });
});
