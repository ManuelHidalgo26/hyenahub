import { describe, it, expect, vi, beforeEach } from "vitest";
import supertest from "supertest";
import jwt from "jsonwebtoken";
import { createApp } from "../app";

vi.mock("../services/prisma.service", () => ({
  prisma: {
    client: { findFirst: vi.fn() },
    routine: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    exercise: { deleteMany: vi.fn() },
  },
}));

// Socket emitToUser is fire-and-forget — silence it in tests
vi.mock("../socket", () => ({ emitToUser: vi.fn(), io: undefined }));
vi.mock("../services/audit.service", () => ({ auditLog: vi.fn() }));

import { prisma } from "../services/prisma.service";

const app = createApp();
const JWT_SECRET = process.env.JWT_SECRET!;

const TRAINER_TOKEN = jwt.sign(
  { userId: "trainer-user-1", email: "t@t.com", role: "TRAINER", profileId: "trainer-profile-1" },
  JWT_SECRET, { expiresIn: "1h" }
);
const CLIENT_TOKEN = jwt.sign(
  { userId: "client-user-1", email: "c@c.com", role: "CLIENT", profileId: "client-profile-1" },
  JWT_SECRET, { expiresIn: "1h" }
);

const validRoutineBody = {
  clientId: "client-profile-1",
  weekStart: new Date("2026-04-28T00:00:00.000Z").toISOString(),
  exercises: [{ name: "Sentadilla", sets: 3, reps: 10, order: 0 }],
};

const mockRoutine = {
  id: "routine-1",
  clientId: "client-profile-1",
  weekStart: new Date("2026-04-28"),
  durationWeeks: 4,
  notes: null,
  exercises: [{ id: "ex-1", name: "Sentadilla", sets: 3, reps: 10, weight: null, notes: null, order: 0, completed: false }],
};

// ─── POST /api/routines ───────────────────────────────────────────────────────
describe("POST /api/routines", () => {
  beforeEach(() => vi.clearAllMocks());

  it("crea rutina correctamente (TRAINER con cliente asignado)", async () => {
    vi.mocked(prisma.client.findFirst).mockResolvedValue({ id: "client-profile-1", userId: "client-user-1", trainerId: "trainer-profile-1" } as never);
    vi.mocked(prisma.routine.create).mockResolvedValue(mockRoutine as never);

    const res = await supertest(app)
      .post("/api/routines")
      .set("Authorization", `Bearer ${TRAINER_TOKEN}`)
      .send(validRoutineBody);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe("routine-1");
  });

  it("rechaza creación si el cliente no pertenece al trainer", async () => {
    vi.mocked(prisma.client.findFirst).mockResolvedValue(null);

    const res = await supertest(app)
      .post("/api/routines")
      .set("Authorization", `Bearer ${TRAINER_TOKEN}`)
      .send(validRoutineBody);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("rechaza sin autenticación", async () => {
    const res = await supertest(app).post("/api/routines").send(validRoutineBody);
    expect(res.status).toBe(401);
  });

  it("rechaza si el rol es CLIENT", async () => {
    const res = await supertest(app)
      .post("/api/routines")
      .set("Authorization", `Bearer ${CLIENT_TOKEN}`)
      .send(validRoutineBody);
    expect(res.status).toBe(403);
  });

  it("rechaza payload inválido (sin exercises)", async () => {
    vi.mocked(prisma.client.findFirst).mockResolvedValue({ id: "client-profile-1" } as never);

    const res = await supertest(app)
      .post("/api/routines")
      .set("Authorization", `Bearer ${TRAINER_TOKEN}`)
      .send({ clientId: "client-profile-1", weekStart: new Date().toISOString(), exercises: [] });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ─── DELETE /api/routines/:id ─────────────────────────────────────────────────
describe("DELETE /api/routines/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("elimina rutina del trainer correctamente", async () => {
    vi.mocked(prisma.routine.findFirst).mockResolvedValue({
      ...mockRoutine, client: { trainerId: "trainer-profile-1" },
    } as never);
    vi.mocked(prisma.routine.delete).mockResolvedValue(mockRoutine as never);

    const res = await supertest(app)
      .delete("/api/routines/routine-1")
      .set("Authorization", `Bearer ${TRAINER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("rechaza eliminar rutina de otro trainer", async () => {
    vi.mocked(prisma.routine.findFirst).mockResolvedValue(null);

    const res = await supertest(app)
      .delete("/api/routines/routine-999")
      .set("Authorization", `Bearer ${TRAINER_TOKEN}`);

    expect(res.status).toBe(404);
  });
});
