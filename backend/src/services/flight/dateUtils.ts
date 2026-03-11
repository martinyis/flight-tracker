// ---------------------------------------------------------------------------
// Pure date math utilities + combo/sentinel computation
// ---------------------------------------------------------------------------

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function diffDays(a: string, b: string): number {
  const msA = new Date(a + "T00:00:00Z").getTime();
  const msB = new Date(b + "T00:00:00Z").getTime();
  return Math.round((msB - msA) / 86_400_000);
}

export function generateDates(from: string, to: string): string[] {
  const dates: string[] = [];
  let cur = from;
  while (cur <= to) {
    dates.push(cur);
    cur = addDays(cur, 1);
  }
  return dates;
}

/** Sample every Nth date from an array. interval=1 means no sampling. */
export function sampleDates(dates: string[], interval: number): string[] {
  if (interval <= 1) return dates;
  return dates.filter((_, i) => i % interval === 0);
}

/**
 * Count the number of (outbound, return) date combos for given params.
 * Pure math — no API calls.
 */
export function countCombos(params: {
  dateFrom: string;
  dateTo: string;
  minNights: number;
  maxNights: number;
}): number {
  const { dateFrom, dateTo, minNights, maxNights } = params;
  const outboundDates = generateDates(dateFrom, addDays(dateTo, -minNights));
  let count = 0;
  for (const out of outboundDates) {
    const earliestReturn = addDays(out, minNights);
    const latestReturn = addDays(out, maxNights);
    const clampedLatest = latestReturn <= dateTo ? latestReturn : dateTo;
    const returnCount = diffDays(earliestReturn, clampedLatest) + 1;
    if (returnCount > 0) count += returnCount;
  }
  return count;
}

/**
 * Select 3-4 sentinel date pairs spread across the search range.
 */
export function selectSentinels(params: {
  dateFrom: string;
  dateTo: string;
  minNights: number;
  maxNights: number;
}): { out: string; ret: string }[] {
  const { dateFrom, dateTo, minNights, maxNights } = params;
  const outboundDates = generateDates(dateFrom, addDays(dateTo, -minNights));
  const allPairs: { out: string; ret: string }[] = [];

  for (const out of outboundDates) {
    const earliestReturn = addDays(out, minNights);
    const latestReturn = addDays(out, maxNights);
    const clampedLatest = latestReturn <= dateTo ? latestReturn : dateTo;
    const returnDates = generateDates(earliestReturn, clampedLatest);
    for (const ret of returnDates) {
      allPairs.push({ out, ret });
    }
  }

  if (allPairs.length <= 4) return allPairs;

  const indices = [
    0,
    Math.floor(allPairs.length * 0.33),
    Math.floor(allPairs.length * 0.66),
    allPairs.length - 1,
  ];
  const unique = [...new Set(indices)];
  return unique.map((i) => allPairs[i]);
}
