import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import * as creditService from "../services/creditService";
import * as appleIapService from "../services/appleIapService";
import { countCombos } from "../services/flightService";
import { COMBO_HARD_CAP } from "../config/constants";
import { BadRequestError } from "../errors/AppError";

export const getBalance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = Number(req.userId);
  const [balance, transactions] = await Promise.all([
    creditService.getBalance(userId),
    creditService.getTransactions(userId),
  ]);
  res.json({ balance, transactions });
});

export const getCost = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = Number(req.userId);
  const { tripType, dateFrom, dateTo, minNights, maxNights } = req.query as {
    tripType: string;
    dateFrom: string;
    dateTo: string;
    minNights?: string;
    maxNights?: string;
  };

  let comboCount: number;
  if (tripType === "oneway") {
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    comboCount = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
  } else {
    const minN = Number(minNights) || 1;
    const maxN = Number(maxNights) || minN;
    comboCount = countCombos({ dateFrom, dateTo, minNights: minN, maxNights: maxN });
  }

  comboCount = Math.min(comboCount, COMBO_HARD_CAP);

  const searchCredits = creditService.computeSearchCredits(comboCount);
  const trackingCredits = creditService.computeTrackingCredits(comboCount);
  const balance = await creditService.getBalance(userId);

  res.json({
    comboCount,
    searchCredits,
    trackingCredits,
    totalCredits: searchCredits + trackingCredits,
    balance,
    canAffordSearch: balance >= searchCredits,
    canAffordSearchAndTracking: balance >= searchCredits + trackingCredits,
  });
});

export const purchase = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = Number(req.userId);
  const { packId } = req.body;

  const pack = creditService.CREDIT_PACKS[packId as creditService.PackId];

  const balance = await creditService.addCredits(userId, pack.credits, "purchase", `${pack.label} pack`);
  const transaction = await creditService.getTransactions(userId, 1);

  res.json({
    balance,
    creditsAdded: pack.credits,
    transaction: transaction[0],
  });
});

export const getPacks = asyncHandler(async (_req: AuthRequest, res: Response) => {
  res.json({ packs: creditService.CREDIT_PACKS });
});

export const verifyPurchase = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = Number(req.userId);
  const { transactionId, productId: clientProductId } = req.body;
  const isXcodeTest =
    process.env.APPLE_ENVIRONMENT === "Xcode" && process.env.NODE_ENV !== "production";

  let resolvedProductId: string;

  if (isXcodeTest) {
    // Local StoreKit Configuration testing — trust client-provided productId
    // Blocked in production even if APPLE_ENVIRONMENT is accidentally set to "Xcode"
    if (!clientProductId) {
      throw new BadRequestError("productId is required in Xcode testing mode");
    }
    resolvedProductId = clientProductId;
  } else {
    // Sandbox / Production — verify with Apple's servers
    const appleTx = await appleIapService.getTransaction(transactionId);
    appleIapService.validateTransaction(appleTx);
    resolvedProductId = appleTx.productId;
  }

  // Resolve credits for this product
  const credits = appleIapService.creditsForProduct(resolvedProductId);
  if (!credits) {
    throw new BadRequestError(`Unknown product: ${resolvedProductId}`);
  }

  // Find pack label for the note
  const packEntry = Object.values(creditService.CREDIT_PACKS).find(
    (p) => p.appleProductId === resolvedProductId
  );
  const note = `${packEntry?.label ?? resolvedProductId} pack`;

  // Grant credits with dedup protection
  const { balance, alreadyProcessed } = await creditService.addCreditsFromApple(
    userId,
    credits,
    transactionId,
    resolvedProductId,
    note
  );

  const transactions = await creditService.getTransactions(userId, 1);

  res.json({
    balance,
    creditsAdded: alreadyProcessed ? 0 : credits,
    alreadyProcessed,
    transaction: transactions[0],
  });
});
