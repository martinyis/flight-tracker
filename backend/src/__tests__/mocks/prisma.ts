import { vi } from "vitest";
import prisma from "../../config/db";

type MockFn = ReturnType<typeof vi.fn>;

interface MockModel {
  findUnique: MockFn;
  findUniqueOrThrow: MockFn;
  findFirst: MockFn;
  findMany: MockFn;
  create: MockFn;
  update: MockFn;
  updateMany: MockFn;
  delete: MockFn;
  deleteMany: MockFn;
  count: MockFn;
}

interface MockPrismaClient {
  user: MockModel;
  savedSearch: MockModel;
  creditTransaction: MockModel;
  refreshToken: MockModel;
  $transaction: MockFn;
  $executeRaw: MockFn;
  $queryRaw: MockFn;
}

export const prismaMock = prisma as unknown as MockPrismaClient;
