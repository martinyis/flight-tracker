/// <reference types="vitest/globals" />
import { vi } from "vitest";

// ── Environment variables (set before any module imports) ──────────────
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-key-for-unit-tests";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test_db";
process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
process.env.GOOGLE_IOS_CLIENT_ID = "test-google-ios-client-id";
process.env.GOOGLE_ANDROID_CLIENT_ID = "test-google-android-client-id";
process.env.LOG_LEVEL = "silent";

// ── Mock Prisma singleton ─────────────────────────────────────────────
vi.mock("../config/db", () => {
  return { default: createMockPrismaClient() };
});

function createMockPrismaClient() {
  const mockModels = {
    user: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    savedSearch: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    creditTransaction: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    refreshToken: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
  };

  return {
    ...mockModels,
    $transaction: vi.fn(async (fn: any, _opts?: any) => {
      if (typeof fn === "function") {
        return fn(mockModels);
      }
      return Promise.all(fn);
    }),
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn(),
  };
}

// ── Mock rate limiter (pass-through in tests) ─────────────────────────
vi.mock("express-rate-limit", () => ({
  default: () => (_req: any, _res: any, next: any) => next(),
  rateLimit: () => (_req: any, _res: any, next: any) => next(),
}));
