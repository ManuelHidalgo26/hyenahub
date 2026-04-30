import { describe, it, expect, vi, beforeEach } from "vitest";
import supertest from "supertest";
import jwt from "jsonwebtoken";
import { createApp } from "../app";

vi.mock("../services/prisma.service", () => ({
  prisma: {
    user:         { findUnique: vi.fn(), create: vi.fn(), count: vi.fn().mockResolvedValue(0) },
    refreshToken: { create: vi.fn() },
    trainer:      { findMany: vi.fn(), count: vi.fn().mockResolvedValue(0) },
    client:       { findMany: vi.fn(), count: vi.fn().mockResolvedValue(0) },
    routine:      { findMany: vi.fn(), count: vi.fn().mockResolvedValue(0) },
    exercise:     { count: vi.fn().mockResolvedValue(0) },
  },
}));

import { prisma } from "../services/prisma.service";

const app = createApp();
const JWT_SECRET = process.env.JWT_SECRET!;

function makeToken(payload: object) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
}

// ─── authenticate middleware ──────────────────────────────────────────────────
describe("authenticate middleware", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rechaza request sin Authorization header", async () => {
    const res = await supertest(app).get("/api/trainer/dashboard");
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Token requerido/i);
  });

  it("rechaza token malformado", async () => {
    const res = await supertest(app)
      .get("/api/trainer/dashboard")
      .set("Authorization", "Bearer token-invalido");
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Token inválido/i);
  });

  it("rechaza token con firma incorrecta", async () => {
    const badToken = jwt.sign({ userId: "x", role: "TRAINER" }, "wrong-secret");
    const res = await supertest(app)
      .get("/api/trainer/dashboard")
      .set("Authorization", `Bearer ${badToken}`);
    expect(res.status).toBe(401);
  });
});

// ─── requireRole middleware ───────────────────────────────────────────────────
describe("requireRole middleware (ADMIN routes)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("bloquea TRAINER en ruta de admin", async () => {
    const token = makeToken({ userId: "u-1", email: "t@t.com", role: "TRAINER", profileId: "p-1" });
    const res = await supertest(app)
      .get("/api/admin/stats")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Acceso denegado/i);
  });

  it("bloquea CLIENT en ruta de admin", async () => {
    const token = makeToken({ userId: "u-2", email: "c@c.com", role: "CLIENT", profileId: "p-2" });
    const res = await supertest(app)
      .get("/api/admin/stats")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("permite ADMIN en ruta de admin (auth pasa, llega al controller)", async () => {
    const token = makeToken({ userId: "u-3", email: "a@a.com", role: "ADMIN", profileId: "u-3" });
    // count mocks already return 0 — auth passes and controller resolves OK
    const res = await supertest(app)
      .get("/api/admin/stats")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("bloquea TRAINER en ruta de admin (DELETE user)", async () => {
    const token = makeToken({ userId: "u-1", email: "t@t.com", role: "TRAINER", profileId: "p-1" });
    const res = await supertest(app)
      .delete("/api/admin/users/some-id")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

// ─── requireRole — TRAINER routes ────────────────────────────────────────────
describe("requireRole middleware (TRAINER routes)", () => {
  it("bloquea CLIENT en ruta de trainer", async () => {
    const token = makeToken({ userId: "u-2", email: "c@c.com", role: "CLIENT", profileId: "p-2" });
    const res = await supertest(app)
      .get("/api/trainer/clients")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("permite TRAINER en ruta de trainer", async () => {
    const token = makeToken({ userId: "u-1", email: "t@t.com", role: "TRAINER", profileId: "p-1" });
    vi.mocked(prisma.user).findUnique = vi.fn().mockResolvedValue(null);
    const res = await supertest(app)
      .get("/api/trainer/clients")
      .set("Authorization", `Bearer ${token}`);
    // Auth passed — whatever the DB returns is fine
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});
