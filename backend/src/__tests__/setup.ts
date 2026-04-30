import { vi } from "vitest";

// Set env vars before any module loads
process.env.JWT_SECRET = "test-secret-key-for-vitest";
process.env.DATABASE_URL = "postgresql://test:test@localhost/test";
process.env.NODE_ENV = "test";

// Silence pino logger in tests
vi.mock("../services/logger.service", () => ({
  default: {
    info:  vi.fn(),
    debug: vi.fn(),
    warn:  vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));
