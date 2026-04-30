import { describe, it, expect, vi } from "vitest";
import supertest from "supertest";
import { createApp } from "../app";

// createApp() imports all controllers which import prisma — mock it even if health route doesn't use it
vi.mock("../services/prisma.service", () => ({ prisma: {} }));

const app = createApp();

describe("GET /api/health", () => {
  it("returns 200 with status ok", async () => {
    const res = await supertest(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.timestamp).toBeDefined();
  });

  it("returns 404 for unknown routes", async () => {
    const res = await supertest(app).get("/api/nonexistent");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
