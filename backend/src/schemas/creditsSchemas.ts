import { z } from "zod";

export const purchaseSchema = {
  body: z.object({
    packId: z.enum(["starter", "standard", "pro", "power"], {
      error: "Invalid pack",
    }),
  }),
};

export const verifyPurchaseSchema = {
  body: z.object({
    transactionId: z.string().min(1, "transactionId is required"),
    productId: z.string().optional(),
  }),
};

export const costQuerySchema = {
  query: z.object({
    tripType: z.enum(["roundtrip", "oneway"]),
    dateFrom: z.string(),
    dateTo: z.string(),
    minNights: z.string().optional(),
    maxNights: z.string().optional(),
  }),
};
