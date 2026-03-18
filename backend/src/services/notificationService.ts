import { PriceHistoryEntry } from "../types/search";

export type NotificationCategory =
  | "departure_approaching"
  | "all_time_low"
  | "big_drop"
  | "moderate_drop"
  | "prices_rising"
  | "big_increase";

export interface NotificationContext {
  searchId: number;
  origin: string;
  destination: string;
  tripType: "roundtrip" | "oneway";
  oldPrice: number | null;
  newPrice: number | null;
  priceHistory: PriceHistoryEntry[];
  dateFrom: string;
  trackingDays: number | null;
  trackingStartedAt: Date | null;
  lastNotifiedAt: Date | null;
  pushToken: string | null;
}

export interface SmartNotification {
  title: string;
  body: string;
  data: { searchId: number; category: NotificationCategory };
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}

function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

/**
 * Analyze price context and generate a smart, actionable notification.
 * Returns null if no notification should be sent.
 */
export function generateSmartNotification(
  ctx: NotificationContext
): SmartNotification | null {
  // Gate: no push token
  if (!ctx.pushToken) return null;

  // Gate: no price data
  if (ctx.newPrice == null) return null;

  // Gate: rate limit — max 1 notification per search per ~20 hours
  if (ctx.lastNotifiedAt) {
    const hoursSinceLast =
      (Date.now() - ctx.lastNotifiedAt.getTime()) / 3_600_000;
    if (hoursSinceLast < 20) return null;
  }

  const route = `${ctx.origin} → ${ctx.destination}`;
  const priceDiff =
    ctx.oldPrice != null ? ctx.oldPrice - ctx.newPrice : 0;
  const priceAbsDiff = Math.abs(priceDiff);
  const pctChange = ctx.oldPrice
    ? (priceAbsDiff / ctx.oldPrice) * 100
    : 0;

  const departure = new Date(ctx.dateFrom + "T00:00:00Z");
  const daysUntilDeparture = daysBetween(new Date(), departure);
  const isSmallChange = priceAbsDiff < 5 && pctChange < 3;

  const allPrices = ctx.priceHistory.map((e) => e.cheapestPrice);
  const historicalMin =
    allPrices.length > 0 ? Math.min(...allPrices) : Infinity;

  // 1. DEPARTURE APPROACHING + GOOD PRICE
  if (daysUntilDeparture <= 7 && daysUntilDeparture > 0) {
    const avgPrice = average(allPrices);
    if (avgPrice > 0 && ctx.newPrice <= avgPrice) {
      const dayWord = daysUntilDeparture === 1 ? "day" : "days";
      return {
        title: route,
        body: `Your trip is in ${daysUntilDeparture} ${dayWord} and $${ctx.newPrice} is a good price — book soon`,
        data: { searchId: ctx.searchId, category: "departure_approaching" },
      };
    }
  }

  // For remaining categories, need an old price and meaningful change
  if (ctx.oldPrice == null || isSmallChange) return null;

  // 2. ALL-TIME LOW (need ≥3 data points for this to be meaningful)
  if (
    priceDiff > 0 &&
    ctx.newPrice < historicalMin &&
    allPrices.length >= 3
  ) {
    return {
      title: route,
      body: `Lowest price we've seen — $${ctx.newPrice} (was $${ctx.oldPrice})`,
      data: { searchId: ctx.searchId, category: "all_time_low" },
    };
  }

  // 3. BIG PRICE DROP (> $30 or > 15%)
  if (priceDiff > 0 && (priceDiff > 30 || pctChange > 15)) {
    return {
      title: route,
      body: `Prices just dropped $${Math.round(priceDiff)} — likely a good time to book`,
      data: { searchId: ctx.searchId, category: "big_drop" },
    };
  }

  // 4. MODERATE PRICE DROP ($5–30)
  if (priceDiff > 0) {
    return {
      title: route,
      body: `Dropped to $${ctx.newPrice} (down $${Math.round(priceDiff)})`,
      data: { searchId: ctx.searchId, category: "moderate_drop" },
    };
  }

  // 5. PRICES RISING AFTER LOW
  // Old price was within 5% of historical minimum and price jumped meaningfully
  if (priceDiff < 0 && (priceAbsDiff > 15 || pctChange > 10)) {
    const wasNearLow = ctx.oldPrice <= historicalMin * 1.05;
    if (wasNearLow) {
      return {
        title: route,
        body: `Prices are climbing back up — was $${ctx.oldPrice}, now $${ctx.newPrice}`,
        data: { searchId: ctx.searchId, category: "prices_rising" },
      };
    }
  }

  // 6. SIGNIFICANT PRICE INCREASE (> $30 or > 15%)
  if (priceDiff < 0 && (priceAbsDiff > 30 || pctChange > 15)) {
    return {
      title: route,
      body: `Heads up: jumped to $${ctx.newPrice} (was $${ctx.oldPrice})`,
      data: { searchId: ctx.searchId, category: "big_increase" },
    };
  }

  return null;
}
