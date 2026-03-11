import prisma from "../../config/db";
import { ApiFilters, readApiFilters } from "../../types/search";
import {
  selectSentinels, searchByParams, searchOneWayByParams,
} from "../flightService";
import { computeNextCheckAt } from "../../workers/priceCheckWorker";
import {
  computeSearchCredits, computeTrackingCredits,
  deductCredits, refundCredits,
} from "../creditService";
import { BadRequestError, NotFoundError } from "../../errors/AppError";
import { ALLOWED_TRACKING_PRESETS } from "../../config/constants";
import {
  jsonLatestResults, jsonRawLegs, jsonApiFilters,
  jsonAvailableAirlines, jsonAirlineLogos, jsonPriceHistory, jsonSentinelPairs,
} from "../../types/prismaJson";
import { parseId, validateApiFilters, appendPriceHistory } from "./helpers";

// ---------------------------------------------------------------------------
// Activate tracking (credits-based)
// ---------------------------------------------------------------------------

export async function activateTracking(id: string, userId: string, trackingDays?: number) {
  const searchId = parseId(id);
  const uid = parseId(userId);

  const search = await prisma.savedSearch.findFirst({
    where: { id: searchId, userId: uid },
  });
  if (!search) throw new NotFoundError("Search not found");

  if (search.trackingActive) {
    throw new BadRequestError("Tracking already activated");
  }

  // Compute effective tracking days
  let effectiveDays: number;
  if (trackingDays == null || trackingDays === 0) {
    // "Until departure"
    const departure = new Date(search.dateFrom + "T00:00:00Z");
    effectiveDays = Math.max(1, Math.ceil((departure.getTime() - Date.now()) / 86_400_000));
  } else if ((ALLOWED_TRACKING_PRESETS as readonly number[]).includes(trackingDays)) {
    effectiveDays = trackingDays;
  } else {
    throw new BadRequestError("trackingDays must be 7, 14, 30, or 0 (until departure)");
  }

  // Cap at days until departure
  const departure = new Date(search.dateFrom + "T00:00:00Z");
  const daysUntilDeparture = Math.max(1, Math.ceil((departure.getTime() - Date.now()) / 86_400_000));
  effectiveDays = Math.min(effectiveDays, daysUntilDeparture);

  // Deduct tracking credits (scaled by duration)
  const trackingCreditCost = computeTrackingCredits(search.comboCount ?? 1, effectiveDays);
  const routeLabel = `Tracking ${effectiveDays}d: ${search.origin}-${search.destination}`;
  const remainingBalance = await deductCredits(uid, trackingCreditCost, "tracking", search.id, routeLabel);

  // Build initial sentinels for round-trip searches
  let sentinels: { out: string; ret: string }[] = [];
  if (search.tripType === "roundtrip" && search.minNights != null && search.maxNights != null) {
    sentinels = selectSentinels({
      dateFrom: search.dateFrom,
      dateTo: search.dateTo,
      minNights: search.minNights,
      maxNights: search.maxNights,
    });
  }

  const now = new Date();
  const updated = await prisma.savedSearch.update({
    where: { id: search.id },
    data: {
      trackingActive: true,
      trackingCredits: trackingCreditCost,
      trackingDays: effectiveDays,
      trackingStartedAt: now,
      active: true,
      nextCheckAt: computeNextCheckAt(search.dateFrom, effectiveDays, now),
      sentinelPairs: jsonSentinelPairs(sentinels),
    },
    omit: { rawLegs: true },
  });

  return { search: updated, creditsCharged: trackingCreditCost, remainingBalance };
}

// ---------------------------------------------------------------------------
// Re-search excluding airlines (replace old search, transfer tracking)
// ---------------------------------------------------------------------------

export async function reSearchExcludingAirlines(
  id: string,
  userId: string,
  excludeAirlines: string[]
) {
  const searchId = parseId(id);
  const uid = parseId(userId);

  const oldSearch = await prisma.savedSearch.findFirst({
    where: { id: searchId, userId: uid },
  });
  if (!oldSearch) throw new NotFoundError("Search not found");

  if (!excludeAirlines || excludeAirlines.length === 0) {
    throw new BadRequestError("excludeAirlines must be a non-empty array");
  }

  // Build new apiFilters: merge old filters, set excludeAirlines, remove includeAirlines
  const oldApiFilters = readApiFilters(oldSearch.apiFilters);
  const newApiFilters: ApiFilters = {
    ...oldApiFilters,
    excludeAirlines,
    includeAirlines: undefined,
  };
  validateApiFilters(newApiFilters);

  // Deduct search credits
  const comboCount = oldSearch.comboCount ?? 1;
  const searchCreditCost = computeSearchCredits(comboCount);
  const routeLabel = `Re-search: ${oldSearch.origin}-${oldSearch.destination} (excl ${excludeAirlines.join(",")})`;
  const remainingBalance = await deductCredits(uid, searchCreditCost, "search", null, routeLabel);

  // Create new search record
  let newSearch = await prisma.savedSearch.create({
    data: {
      userId: uid,
      tripType: oldSearch.tripType,
      origin: oldSearch.origin,
      destination: oldSearch.destination,
      dateFrom: oldSearch.dateFrom,
      dateTo: oldSearch.dateTo,
      comboCount,
      searchCredits: searchCreditCost,
      apiFilters: jsonApiFilters(newApiFilters),
      trackingActive: false,
      active: false,
      ...(oldSearch.tripType === "roundtrip" && {
        minNights: oldSearch.minNights,
        maxNights: oldSearch.maxNights,
      }),
    },
  });

  // Run SerpAPI search with new filters
  try {
    if (newSearch.tripType === "oneway") {
      const { results, cheapestPrice, availableAirlines, airlineLogos, rawLegs } =
        await searchOneWayByParams({
          origin: newSearch.origin,
          destination: newSearch.destination,
          dateFrom: newSearch.dateFrom,
          dateTo: newSearch.dateTo,
          apiFilters: newApiFilters,
        });

      newSearch = await prisma.savedSearch.update({
        where: { id: newSearch.id },
        data: {
          rawLegs: jsonRawLegs({ outbound: rawLegs, return: [] }),
          latestResults: jsonLatestResults(results),
          cheapestPrice,
          availableAirlines: jsonAvailableAirlines(availableAirlines),
          airlineLogos: jsonAirlineLogos(airlineLogos),
          lastCheckedAt: new Date(),
          nextCheckAt: computeNextCheckAt(newSearch.dateFrom),
          priceHistory: jsonPriceHistory(appendPriceHistory([], cheapestPrice)),
        },
      });
    } else {
      const { results, unhydratedOptions, cheapestPrice, availableAirlines, airlineLogos, allRawOptions } =
        await searchByParams({
          origin: newSearch.origin,
          destination: newSearch.destination,
          dateFrom: newSearch.dateFrom,
          dateTo: newSearch.dateTo,
          minNights: newSearch.minNights!,
          maxNights: newSearch.maxNights!,
          apiFilters: newApiFilters,
        });

      newSearch = await prisma.savedSearch.update({
        where: { id: newSearch.id },
        data: {
          rawLegs: jsonRawLegs(allRawOptions),
          latestResults: jsonLatestResults([...results, ...unhydratedOptions]),
          cheapestPrice,
          availableAirlines: jsonAvailableAirlines(availableAirlines),
          airlineLogos: jsonAirlineLogos(airlineLogos),
          lastCheckedAt: new Date(),
          nextCheckAt: computeNextCheckAt(newSearch.dateFrom),
          priceHistory: jsonPriceHistory(appendPriceHistory([], cheapestPrice)),
        },
      });
    }
  } catch (err) {
    // SerpAPI failed — refund credits and clean up
    await refundCredits(uid, searchCreditCost, newSearch.id, `Refund: ${routeLabel} (search failed)`);
    await prisma.savedSearch.delete({ where: { id: newSearch.id } });
    throw err;
  }

  // Transfer tracking from old search if it was active
  if (oldSearch.trackingActive) {
    let sentinels: { out: string; ret: string }[] = [];
    if (newSearch.tripType === "roundtrip" && newSearch.minNights != null && newSearch.maxNights != null) {
      sentinels = selectSentinels({
        dateFrom: newSearch.dateFrom,
        dateTo: newSearch.dateTo,
        minNights: newSearch.minNights,
        maxNights: newSearch.maxNights,
      });
    }

    newSearch = await prisma.savedSearch.update({
      where: { id: newSearch.id },
      data: {
        trackingActive: true,
        trackingCredits: oldSearch.trackingCredits,
        trackingDays: oldSearch.trackingDays,
        trackingStartedAt: oldSearch.trackingStartedAt,
        active: true,
        nextCheckAt: computeNextCheckAt(
          newSearch.dateFrom,
          oldSearch.trackingDays,
          oldSearch.trackingStartedAt
        ),
        sentinelPairs: jsonSentinelPairs(sentinels),
      },
    });
  }

  // Deactivate old search
  await prisma.savedSearch.update({
    where: { id: oldSearch.id },
    data: { active: false, trackingActive: false },
  });

  return {
    search: newSearch,
    creditsCharged: searchCreditCost,
    remainingBalance,
    oldSearchId: oldSearch.id,
  };
}
