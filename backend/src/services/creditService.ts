import prisma from "../config/db";
import { PaymentRequiredError } from "../errors/AppError";
import { SIGNUP_BONUS } from "../config/constants";

/** Search credit cost tiers based on combo count (~1.5x API cost, rounded up to nearest 5) */
const SEARCH_TIERS: [number, number][] = [
  [10, 5],
  [20, 10],
  [50, 20],
  [100, 35],
  [150, 55],
  [200, 80],
];

/** Tracking credit cost tiers — base cost for 14 days. Scaled linearly for other durations. */
const TRACKING_TIERS: [number, number][] = [
  [10, 50],
  [20, 55],
  [50, 70],
  [100, 95],
  [150, 125],
  [200, 160],
];

function lookupTier(tiers: [number, number][], comboCount: number): number {
  for (const [maxCombos, credits] of tiers) {
    if (comboCount <= maxCombos) return credits;
  }
  return tiers[tiers.length - 1][1];
}

export function computeSearchCredits(comboCount: number): number {
  return Math.max(1, lookupTier(SEARCH_TIERS, comboCount));
}

export function computeTrackingCredits(comboCount: number, trackingDays: number = 14): number {
  const base14 = Math.max(1, lookupTier(TRACKING_TIERS, comboCount));
  return Math.ceil(base14 * (trackingDays / 14));
}

export async function getBalance(userId: number): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { creditBalance: true },
  });
  if (!user) return 0;
  return user.creditBalance;
}

export async function getTransactions(userId: number, limit = 20) {
  return prisma.creditTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function deductCredits(
  userId: number,
  amount: number,
  type: string,
  searchId?: number | null,
  note?: string
): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { creditBalance: true },
    });

    if (user.creditBalance < amount) {
      throw new PaymentRequiredError(
        `Insufficient credits. Need ${amount}, have ${user.creditBalance}.`,
        { code: "INSUFFICIENT_CREDITS", needed: amount, balance: user.creditBalance }
      );
    }

    const updated = await tx.user.update({
      where: { id: userId },
      data: { creditBalance: { decrement: amount } },
      select: { creditBalance: true },
    });

    await tx.creditTransaction.create({
      data: {
        userId,
        searchId: searchId ?? null,
        amount: -amount,
        type,
        note: note ?? null,
      },
    });

    return updated.creditBalance;
  }, { isolationLevel: "Serializable" });
}

export async function addCredits(
  userId: number,
  amount: number,
  type: string,
  note?: string
): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: userId },
      data: { creditBalance: { increment: amount } },
      select: { creditBalance: true },
    });

    await tx.creditTransaction.create({
      data: {
        userId,
        amount,
        type,
        note: note ?? null,
      },
    });

    return updated.creditBalance;
  });
}

export async function grantSignupBonus(userId: number): Promise<void> {
  await addCredits(userId, SIGNUP_BONUS, "signup_bonus", "Welcome bonus");
}

export async function refundCredits(
  userId: number,
  amount: number,
  searchId: number,
  note: string
): Promise<number> {
  return addCredits(userId, amount, "refund", note);
}

/** Credit pack definitions */
export const CREDIT_PACKS = {
  starter: { credits: 50, price: 4.99, label: "Starter" },
  standard: { credits: 150, price: 12.99, label: "Standard" },
  pro: { credits: 400, price: 29.99, label: "Pro" },
  power: { credits: 1000, price: 59.99, label: "Power" },
} as const;

export type PackId = keyof typeof CREDIT_PACKS;
