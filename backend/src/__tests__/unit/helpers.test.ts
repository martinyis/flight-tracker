import { describe, it, expect, vi } from "vitest";
import {
  parseId,
  validateApiFilters,
  appendPriceHistory,
} from "../../services/search/helpers";
import { BadRequestError } from "../../errors/AppError";

describe("parseId", () => {
  it("returns integer for valid numeric string", () => {
    expect(parseId("42")).toBe(42);
  });

  it("throws BadRequestError for non-numeric string", () => {
    expect(() => parseId("abc")).toThrow(BadRequestError);
  });

  it("throws BadRequestError for empty string", () => {
    expect(() => parseId("")).toThrow(BadRequestError);
  });
});

describe("validateApiFilters", () => {
  it("passes for undefined filters", () => {
    expect(() => validateApiFilters(undefined)).not.toThrow();
  });

  it("passes for valid stops values", () => {
    expect(() => validateApiFilters({ stops: 1 })).not.toThrow();
    expect(() => validateApiFilters({ stops: 2 })).not.toThrow();
    expect(() => validateApiFilters({ stops: 3 })).not.toThrow();
  });

  it("throws for invalid stops value", () => {
    expect(() => validateApiFilters({ stops: 4 as any })).toThrow(BadRequestError);
  });

  it("throws when both includeAirlines and excludeAirlines are provided", () => {
    expect(() =>
      validateApiFilters({ includeAirlines: ["UA"], excludeAirlines: ["DL"] })
    ).toThrow(BadRequestError);
  });

  it("passes for valid 2-letter airline codes", () => {
    expect(() => validateApiFilters({ includeAirlines: ["UA", "DL"] })).not.toThrow();
  });

  it("passes for valid alliance names", () => {
    expect(() =>
      validateApiFilters({ includeAirlines: ["STAR_ALLIANCE", "ONEWORLD"] })
    ).not.toThrow();
  });

  it("throws for invalid airline code", () => {
    expect(() => validateApiFilters({ includeAirlines: ["INVALID"] })).toThrow(
      BadRequestError
    );
  });

  it("passes for valid maxDuration", () => {
    expect(() => validateApiFilters({ maxDuration: 600 })).not.toThrow();
  });

  it("throws for maxDuration <= 0", () => {
    expect(() => validateApiFilters({ maxDuration: 0 })).toThrow(BadRequestError);
  });

  it("throws for maxDuration > 2880", () => {
    expect(() => validateApiFilters({ maxDuration: 2881 })).toThrow(BadRequestError);
  });

  it("passes for valid bags values", () => {
    expect(() => validateApiFilters({ bags: 0 })).not.toThrow();
    expect(() => validateApiFilters({ bags: 1 })).not.toThrow();
  });

  it("throws for invalid bags value", () => {
    expect(() => validateApiFilters({ bags: 2 as any })).toThrow(BadRequestError);
  });
});

describe("appendPriceHistory", () => {
  it("appends new entry for new date", () => {
    const today = new Date().toISOString().slice(0, 10);
    const existing = [{ date: "2026-03-01", cheapestPrice: 500 }];

    const result = appendPriceHistory(existing, 450);

    expect(result).toEqual([
      { date: "2026-03-01", cheapestPrice: 500 },
      { date: today, cheapestPrice: 450 },
    ]);
  });

  it("updates same-day entry if new price is lower", () => {
    const today = new Date().toISOString().slice(0, 10);
    const existing = [{ date: today, cheapestPrice: 500 }];

    const result = appendPriceHistory(existing, 400);

    expect(result).toEqual([{ date: today, cheapestPrice: 400 }]);
  });

  it("keeps same-day entry if new price is higher", () => {
    const today = new Date().toISOString().slice(0, 10);
    const existing = [{ date: today, cheapestPrice: 400 }];

    const result = appendPriceHistory(existing, 500);

    expect(result).toEqual([{ date: today, cheapestPrice: 400 }]);
  });

  it("returns existing array unchanged if cheapestPrice is null", () => {
    const existing = [{ date: "2026-03-01", cheapestPrice: 500 }];
    expect(appendPriceHistory(existing, null)).toBe(existing);
  });

  it("appends to empty array", () => {
    const today = new Date().toISOString().slice(0, 10);
    const result = appendPriceHistory([], 300);
    expect(result).toEqual([{ date: today, cheapestPrice: 300 }]);
  });
});
