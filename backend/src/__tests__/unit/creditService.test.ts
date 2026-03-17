import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "../mocks/prisma";
import {
  computeSearchCredits,
  computeTrackingCredits,
  getBalance,
  getTransactions,
  deductCredits,
  addCredits,
  grantSignupBonus,
  refundCredits,
  CREDIT_PACKS,
} from "../../services/creditService";
import { PaymentRequiredError } from "../../errors/AppError";

// ── Pure functions ────────────────────────────────────────────────────

describe("computeSearchCredits", () => {
  it.each([
    [1, 5],
    [10, 5],
    [11, 10],
    [20, 10],
    [50, 20],
    [100, 35],
    [150, 55],
    [200, 80],
    [999, 80],
  ])("returns %i credits for comboCount %i", (combos, expected) => {
    expect(computeSearchCredits(combos)).toBe(expected);
  });

  it("returns first tier for comboCount 0", () => {
    expect(computeSearchCredits(0)).toBe(5);
  });
});

describe("computeTrackingCredits", () => {
  it("returns base cost for 14 days", () => {
    expect(computeTrackingCredits(5, 14)).toBe(50);
  });

  it("scales to half for 7 days", () => {
    expect(computeTrackingCredits(5, 7)).toBe(25);
  });

  it("scales up for 30 days", () => {
    // ceil(50 * 30/14) = ceil(107.14) = 108
    expect(computeTrackingCredits(5, 30)).toBe(108);
  });

  it("defaults to 14 days when trackingDays omitted", () => {
    expect(computeTrackingCredits(5)).toBe(50);
  });

  it("handles higher tier combos", () => {
    expect(computeTrackingCredits(200, 14)).toBe(160);
  });

  it("scales higher tier for 30 days", () => {
    // ceil(160 * 30/14) = ceil(342.86) = 343
    expect(computeTrackingCredits(200, 30)).toBe(343);
  });

  it("returns first tier for comboCount 0", () => {
    expect(computeTrackingCredits(0, 14)).toBe(50);
  });
});

describe("CREDIT_PACKS", () => {
  it("has 4 packs with correct values", () => {
    expect(CREDIT_PACKS.starter).toMatchObject({ credits: 50, price: 4.99, label: "Starter" });
    expect(CREDIT_PACKS.standard).toMatchObject({ credits: 150, price: 12.99, label: "Standard" });
    expect(CREDIT_PACKS.pro).toMatchObject({ credits: 400, price: 29.99, label: "Pro" });
    expect(CREDIT_PACKS.power).toMatchObject({ credits: 1000, price: 59.99, label: "Power" });
    expect(Object.keys(CREDIT_PACKS)).toHaveLength(4);
  });
});

// ── Async functions (mocked Prisma) ───────────────────────────────────

describe("getBalance", () => {
  it("returns creditBalance when user exists", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ creditBalance: 150 });
    expect(await getBalance(1)).toBe(150);
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: { creditBalance: true },
    });
  });

  it("returns 0 when user not found", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    expect(await getBalance(999)).toBe(0);
  });
});

describe("getTransactions", () => {
  it("returns transactions with default limit", async () => {
    const txns = [{ id: 1, amount: -5 }];
    prismaMock.creditTransaction.findMany.mockResolvedValue(txns);

    const result = await getTransactions(1);
    expect(result).toEqual(txns);
    expect(prismaMock.creditTransaction.findMany).toHaveBeenCalledWith({
      where: { userId: 1 },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  });

  it("respects custom limit", async () => {
    prismaMock.creditTransaction.findMany.mockResolvedValue([]);
    await getTransactions(1, 5);
    expect(prismaMock.creditTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 })
    );
  });
});

describe("deductCredits", () => {
  it("deducts credits and creates negative ledger entry", async () => {
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({ creditBalance: 100 });
    prismaMock.user.update.mockResolvedValue({ creditBalance: 95 });
    prismaMock.creditTransaction.create.mockResolvedValue({});

    const result = await deductCredits(1, 5, "search", 42, "Test search");

    expect(result).toBe(95);
    expect(prismaMock.user.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: 1 },
      select: { creditBalance: true },
    });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { creditBalance: { decrement: 5 } },
      select: { creditBalance: true },
    });
    expect(prismaMock.creditTransaction.create).toHaveBeenCalledWith({
      data: { userId: 1, searchId: 42, amount: -5, type: "search", note: "Test search" },
    });
  });

  it("throws PaymentRequiredError when balance is insufficient", async () => {
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({ creditBalance: 3 });

    await expect(deductCredits(1, 10, "search")).rejects.toThrow(PaymentRequiredError);
  });

  it("uses Serializable isolation", async () => {
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({ creditBalance: 100 });
    prismaMock.user.update.mockResolvedValue({ creditBalance: 90 });
    prismaMock.creditTransaction.create.mockResolvedValue({});

    await deductCredits(1, 10, "search");

    expect(prismaMock.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: "Serializable" }
    );
  });

  it("defaults searchId and note to null", async () => {
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({ creditBalance: 100 });
    prismaMock.user.update.mockResolvedValue({ creditBalance: 95 });
    prismaMock.creditTransaction.create.mockResolvedValue({});

    await deductCredits(1, 5, "search");

    expect(prismaMock.creditTransaction.create).toHaveBeenCalledWith({
      data: { userId: 1, searchId: null, amount: -5, type: "search", note: null },
    });
  });
});

describe("addCredits", () => {
  it("increments balance and creates positive ledger entry", async () => {
    prismaMock.user.update.mockResolvedValue({ creditBalance: 200 });
    prismaMock.creditTransaction.create.mockResolvedValue({});

    const result = await addCredits(1, 50, "purchase", "Starter pack");

    expect(result).toBe(200);
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { creditBalance: { increment: 50 } },
      select: { creditBalance: true },
    });
    expect(prismaMock.creditTransaction.create).toHaveBeenCalledWith({
      data: { userId: 1, amount: 50, type: "purchase", note: "Starter pack" },
    });
  });

  it("defaults note to null", async () => {
    prismaMock.user.update.mockResolvedValue({ creditBalance: 50 });
    prismaMock.creditTransaction.create.mockResolvedValue({});

    await addCredits(1, 50, "signup_bonus");

    expect(prismaMock.creditTransaction.create).toHaveBeenCalledWith({
      data: { userId: 1, amount: 50, type: "signup_bonus", note: null },
    });
  });
});

describe("grantSignupBonus", () => {
  it("adds 50 credits as signup_bonus", async () => {
    prismaMock.user.update.mockResolvedValue({ creditBalance: 50 });
    prismaMock.creditTransaction.create.mockResolvedValue({});

    await grantSignupBonus(1);

    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { creditBalance: { increment: 50 } },
      })
    );
    expect(prismaMock.creditTransaction.create).toHaveBeenCalledWith({
      data: { userId: 1, amount: 50, type: "signup_bonus", note: "Welcome bonus" },
    });
  });
});

describe("refundCredits", () => {
  it("adds credits back as refund type", async () => {
    prismaMock.user.update.mockResolvedValue({ creditBalance: 55 });
    prismaMock.creditTransaction.create.mockResolvedValue({});

    const result = await refundCredits(1, 5, 42, "Search failed");

    expect(result).toBe(55);
    expect(prismaMock.creditTransaction.create).toHaveBeenCalledWith({
      data: { userId: 1, amount: 5, type: "refund", note: "Search failed" },
    });
  });
});
