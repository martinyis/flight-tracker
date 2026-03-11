import { z } from "zod";

const iataCode = z.string().length(3, "Airport codes must be 3 characters").toUpperCase();
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format");

export const createSearchSchema = {
  body: z
    .object({
      tripType: z.enum(["roundtrip", "oneway"], {
        error: "tripType must be 'roundtrip' or 'oneway'",
      }),
      origin: iataCode,
      destination: iataCode,
      dateFrom: dateString,
      dateTo: dateString,
      minNights: z.number().int().min(1).optional(),
      maxNights: z.number().int().min(1).optional(),
      apiFilters: z
        .object({
          stops: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
          includeAirlines: z.array(z.string()).optional(),
          excludeAirlines: z.array(z.string()).optional(),
          maxDuration: z.number().int().min(1).max(2880).optional(),
          bags: z.union([z.literal(0), z.literal(1)]).optional(),
        })
        .optional(),
    })
    .refine((data) => data.dateFrom < data.dateTo, {
      message: "dateFrom must be before dateTo",
      path: ["dateFrom"],
    })
    .refine(
      (data) => data.tripType === "oneway" || (data.minNights != null && data.maxNights != null),
      { message: "minNights and maxNights are required for round trips", path: ["minNights"] }
    )
    .refine(
      (data) =>
        data.minNights == null || data.maxNights == null || data.minNights <= data.maxNights,
      { message: "minNights must be <= maxNights", path: ["minNights"] }
    ),
};

export const searchIdParam = {
  params: z.object({
    id: z.string().regex(/^\d+$/, "ID must be a number"),
  }),
};

export const bookingUrlSchema = {
  body: z
    .object({
      departure_token: z.string().optional(),
      booking_token: z.string().optional(),
      origin: iataCode,
      destination: iataCode,
      date: dateString,
      returnDate: dateString.optional(),
    })
    .refine((data) => data.departure_token || data.booking_token, {
      message: "departure_token or booking_token is required",
    }),
};

export const updateFiltersSchema = {
  body: z.object({
    filters: z
      .object({
        airlines: z.array(z.string()).optional(),
      })
      .optional()
      .default({}),
  }),
};

export const refreshSearchSchema = {
  body: z.object({
    resetFilter: z.boolean().optional().default(false),
  }),
};

export const activateTrackingSchema = {
  body: z.object({
    trackingDays: z.number().int().optional(),
  }),
};

export const hydrateOneSchema = {
  body: z.object({
    optionIndex: z.number({ error: "optionIndex (number) is required" }).int(),
  }),
};

export const reSearchSchema = {
  body: z.object({
    excludeAirlines: z
      .array(z.string())
      .min(1, "excludeAirlines (non-empty array) is required"),
  }),
};
