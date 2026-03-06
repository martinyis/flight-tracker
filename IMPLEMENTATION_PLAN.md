# Implementation Plan: API Cost Reduction

## Summary

Reduce SerpAPI costs by ~90-97% through three complementary strategies: (1) skip return-leg fetching during background cron checks and hydrate lazily when the user opens a search, (2) adopt adaptive check frequency based on departure proximity, and (3) sample every 3rd outbound date during cron instead of exhaustively searching every day. These changes transform an estimated $12/search/day into roughly $0.35-$1.20/search/day.

## Context & Problem

The current price check cron (`priceCheckWorker.ts`) fires ~70-80 SerpAPI calls per round-trip saved search per check cycle. At $0.025/credit and 6 checks/day (every 4 hours), that is roughly $12/search/day. Even a handful of active users would burn hundreds of dollars monthly.

The cost breaks down as:
- **~40 calls**: `searchRoundTrip` for every (outbound, return) date pair
- **~30 calls**: `fetchReturnLeg` via `buildCombosFromRawOptions` to get return flight details for the top 30 options

For background price monitoring, neither the return-leg details nor exhaustive date coverage is necessary.

## Chosen Approach

Three strategies, implemented in order of dependency:

1. **Skip return-leg fetching during cron** -- Store `RoundTripRawOption[]` (outbound + total price, no return details) during cron. Add a new `POST /search/:id/hydrate` endpoint that fetches return-leg details on-demand when the user opens the detail screen. This eliminates ~30 calls per check.

2. **Date sampling for cron** -- During cron, search every 3rd outbound date instead of every single day. Flight prices within a 3-day window are highly correlated, so sampling preserves price trend accuracy while cutting round-trip search calls by ~65%. Full exhaustive search still runs on manual refresh and initial search creation.

3. **Adaptive check frequency** -- Add a `nextCheckAt` timestamp to `SavedSearch`. The cron runs frequently (every hour) but only processes searches where `nextCheckAt <= now()`. Tier schedule:
   - 30+ days to departure: once per day
   - 7-30 days: every 8 hours
   - Under 7 days: every 4 hours
   - Under 2 days: every 2 hours

## Detailed Implementation Steps

### Phase 1: Skip Return-Leg Fetching During Cron (Backend)

This is the highest-impact change and has no dependencies on the other phases.

#### Step 1.1: Add a `mode` parameter to `fetchAndReduceCombos`

**File**: `backend/src/services/flightService.ts`

Add a `mode` option to `SearchParams` (or as a separate parameter) that controls whether return legs are fetched:

```
mode?: "full" | "price-only"
```

When `mode === "price-only"`:
- `fetchAndReduceCombos` still generates date pairs and calls `searchRoundTrip` for each (these return outbound details + `group.price` which is the real round-trip total).
- Instead of calling `buildCombosFromRawOptions` (which fires `fetchReturnLeg` for each of the top 30), it returns `RoundTripRawOption[]` directly.
- The function return type changes to accommodate both modes.

Specifically, modify `fetchAndReduceCombos` (currently lines 351-442):
- After the `searchRoundTrip` pMap call (line 380-384) which produces `rawRoundTrips`, add an early return when `mode === "price-only"`:
  - Sort `rawRoundTrips` by price, take top 30.
  - Extract `availableAirlines` and `airlineLogos` from outbound legs only.
  - Return early with `{ rawOptions: top30, availableAirlines, airlineLogos }` -- no `allCombos` and no `combos`.
- When `mode === "full"` (or unset), the existing behavior is preserved: call `buildCombosFromRawOptions` on the top 30, return `FlightCombo[]` as before.

Add a new exported wrapper function for the cron path:

```
export async function fetchPriceOnly(params: SearchParams): Promise<{
  rawOptions: RoundTripRawOption[];
  cheapestPrice: number | null;
  availableAirlines: string[];
  airlineLogos: Record<string, string>;
}>
```

This calls the `"price-only"` path of `fetchAndReduceCombos` and computes `cheapestPrice` from `rawOptions[0].price` (they are sorted by price).

#### Step 1.2: Add `hydrateReturnLegs` function

**File**: `backend/src/services/flightService.ts`

Add a new exported function that takes stored `RoundTripRawOption[]` and hydrates them into `FlightCombo[]`:

```
export async function hydrateReturnLegs(
  rawOptions: RoundTripRawOption[],
  origin: string,
  destination: string,
  filters?: SearchFilters,
  limit?: number
): Promise<{
  combos: FlightCombo[];
  availableAirlines: string[];
  airlineLogos: Record<string, string>;
}>
```

This function:
1. Optionally filters `rawOptions` by airline (outbound airline only, since we do not have return data yet).
2. Takes top N (default 10) by price.
3. Calls `buildCombosFromRawOptions` on those N options (this fires `fetchReturnLeg` for each).
4. Returns the hydrated `FlightCombo[]` with airlines and logos from both legs.

This is essentially the same logic currently in `fetchAndReduceCombos` lines 400-441, but extracted to work on stored data.

#### Step 1.3: Update the price check worker

**File**: `backend/src/workers/priceCheckWorker.ts`

In the round-trip branch of the cron loop (currently lines 137-179):

- Replace the call to `searchByParams` with `fetchPriceOnly`.
- Store the result in the DB differently:
  - `rawLegs`: store `rawOptions` (which is `RoundTripRawOption[]` -- outbound legs + prices, no return details).
  - `latestResults`: store the same `rawOptions` cast to `any` (or an empty array -- see note below).
  - `cheapestPrice`: from the function return.
  - `availableAirlines` and `airlineLogos`: from the function return (outbound airlines only).

**Important decision on `latestResults`**: During cron, `latestResults` will contain `RoundTripRawOption[]` (not `FlightCombo[]`). The frontend needs to handle this gracefully. Two options:
- (A) Store `RoundTripRawOption[]` in `latestResults` and have the frontend detect the format and show partial data.
- (B) Store an empty `[]` in `latestResults` and only populate it after hydration.

**Recommended: Option A.** Store `RoundTripRawOption[]` in `latestResults`. The frontend can show outbound details + total price in the strip, and show a "Loading return details..." state for the return leg portion. This is better UX than showing nothing.

#### Step 1.4: Add hydrate endpoint

**File**: `backend/src/routes/search.ts`

Add a new route:
```
router.post("/:id/hydrate", savedSearchController.hydrateSearch);
```

**File**: `backend/src/controllers/savedSearchController.ts`

Add a new controller function `hydrateSearch`:
- Calls `savedSearchService.hydrateSearch(req.params.id, req.userId!)`.
- Returns the updated search with hydrated `latestResults`.

**File**: `backend/src/services/savedSearchService.ts`

Add a new function `hydrateSearch(id: string, userId: string)`:
1. Load the search from DB (including `rawLegs`).
2. Check if `rawLegs` is `RoundTripRawOption[]` (using the existing `isLegacyRoundTripRawLegs` type guard -- which actually tests for exactly this format).
3. If it is already `FlightCombo[]` (via `isComboRawLegs`), return the search as-is (already hydrated).
4. If it is `RoundTripRawOption[]`, call `hydrateReturnLegs(rawOptions, search.origin, search.destination, searchFilters)`.
5. Update the DB: set `rawLegs` to the hydrated `FlightCombo[]`, set `latestResults` to the filtered combos.
6. Return the updated search (omitting `rawLegs` in the response, same pattern as other endpoints).

#### Step 1.5: Update type guards

**File**: `backend/src/types/search.ts`

The existing `isLegacyRoundTripRawLegs` type guard (lines 41-45) already detects `RoundTripRawOption[]`. However, the name "legacy" is misleading now since this is the *primary* cron format. Rename it to `isRawOptionFormat` (or add an alias) and update all references.

Also update the `RawLegs` type (line 38) documentation to reflect that `RoundTripRawOption[]` is the standard cron format, not a legacy format.

#### Step 1.6: Update `refreshSearch` in savedSearchService

**File**: `backend/src/services/savedSearchService.ts`

The existing `refreshSearch` function (lines 320-390) does a full SerpAPI search including return legs. This is the *manual refresh* path triggered by the user tapping the refresh button. **Keep this as-is** -- manual refresh should still do the full search with return legs, since the user is actively looking at the search and expects complete results.

However, the `refreshSearch` function currently calls `searchByParams` which goes through `fetchAndReduceCombos`. Ensure `searchByParams` continues to use `mode: "full"` (the default).

#### Step 1.7: Update `updateFilters` for RoundTripRawOption format

**File**: `backend/src/services/savedSearchService.ts`

The `updateFilters` function (lines 396-467) already handles both `isComboRawLegs` (new format) and `isLegacyRoundTripRawLegs` (raw option format). The `isLegacyRoundTripRawLegs` branch (lines 441-449) calls `buildCombosFromRawOptions` which fires API calls. This needs to change:

When the user applies an airline filter to a non-hydrated search:
- For the `RoundTripRawOption[]` case, filter the options by outbound airline and recompute `cheapestPrice` -- but do NOT call `buildCombosFromRawOptions`. The return is `RoundTripRawOption[]` filtered by the airline.
- This means `latestResults` remains `RoundTripRawOption[]` with the filter applied.
- The hydration endpoint will re-apply filters after hydrating.

### Phase 2: Date Sampling for Cron (Backend)

This is independent of Phase 1 but compounds with it. Implement after Phase 1.

#### Step 2.1: Add a `sampleDates` helper

**File**: `backend/src/services/flightService.ts`

Add a function that samples dates at a given interval:

```
function sampleDates(dates: string[], interval: number): string[] {
  return dates.filter((_, i) => i % interval === 0);
}
```

#### Step 2.2: Add `fetchPriceOnlySampled` function (or add sampling to `fetchPriceOnly`)

**File**: `backend/src/services/flightService.ts`

Modify `fetchPriceOnly` (created in Step 1.1) to accept an optional `sampleInterval` parameter (default: 1, meaning no sampling):

- In the date pair generation logic (currently lines 366-377 in `fetchAndReduceCombos`), apply sampling to outbound dates:
  ```
  const outboundDates = sampleDates(generateDates(dateFrom, ...), sampleInterval);
  ```
- Return dates are NOT sampled -- for each sampled outbound date, we still check all valid return dates within the nights range. The return date dimension is smaller (controlled by minNights/maxNights, typically 3-7 options) and contributes less to total calls.

For the cron path, pass `sampleInterval: 3`.
For the manual refresh and initial creation paths, keep `sampleInterval: 1` (exhaustive).

#### Step 2.3: Update the cron worker to pass sampleInterval

**File**: `backend/src/workers/priceCheckWorker.ts`

When calling `fetchPriceOnly`, pass `sampleInterval: 3`:

```
const result = await fetchPriceOnly({ ...group.params, sampleInterval: 3 });
```

No changes needed for one-way searches -- the one-way cron path calls `searchOneWayByParams`, and one-way searches make far fewer API calls (one per date). Apply sampling to one-way as well by adding a `sampleInterval` parameter to `fetchAndReduceOneWay` or creating a separate `fetchOneWayPriceOnly` function.

### Phase 3: Adaptive Check Frequency (Backend + DB)

This requires a database migration. Implement after Phase 1 and Phase 2 since it is the most structural change.

#### Step 3.1: Add `nextCheckAt` column to SavedSearch

**File**: `backend/prisma/schema.prisma`

Add a new field to the `SavedSearch` model:

```prisma
nextCheckAt DateTime? @map("next_check_at")
```

Add it to the existing index on `[active, dateTo]` or create a new index:

```prisma
@@index([active, nextCheckAt])
```

Run `npx prisma migrate dev --name add-next-check-at`.

#### Step 3.2: Add tier calculation function

**File**: `backend/src/workers/priceCheckWorker.ts` (or a new file `backend/src/services/checkScheduler.ts`)

Add a function that computes the next check time based on departure proximity:

```
function computeNextCheckAt(dateFrom: string): Date {
  const now = new Date();
  const departure = new Date(dateFrom + "T00:00:00Z");
  const daysOut = Math.floor((departure.getTime() - now.getTime()) / 86_400_000);

  let intervalHours: number;
  if (daysOut >= 30) {
    intervalHours = 24;       // once per day
  } else if (daysOut >= 7) {
    intervalHours = 8;        // 3x per day
  } else if (daysOut >= 2) {
    intervalHours = 4;        // 6x per day
  } else {
    intervalHours = 2;        // 12x per day (last 48 hours)
  }

  return new Date(now.getTime() + intervalHours * 3600_000);
}
```

#### Step 3.3: Update the cron schedule

**File**: `backend/src/workers/priceCheckWorker.ts`

Change the cron schedule from `"0 */4 * * *"` (every 4 hours) to `"0 * * * *"` (every hour). The cron runs more frequently but processes fewer searches per run, based on `nextCheckAt`.

#### Step 3.4: Update the cron query filter

**File**: `backend/src/workers/priceCheckWorker.ts`

In `runPriceCheck`, change the query that loads active searches (currently lines 50-52):

```typescript
const searches = await prisma.savedSearch.findMany({
  where: {
    active: true,
    dateTo: { gte: today },
    OR: [
      { nextCheckAt: null },              // never checked (backfill)
      { nextCheckAt: { lte: new Date() } } // due for check
    ],
  },
});
```

This ensures:
- Existing searches with `nextCheckAt = null` are checked immediately (backward compatible).
- New searches get their `nextCheckAt` set after their first cron check.

#### Step 3.5: Set `nextCheckAt` after each check

**File**: `backend/src/workers/priceCheckWorker.ts`

After successfully checking a search, update its `nextCheckAt`:

In the per-search update loop (inside the `for (const searchId of group.searchIds)` blocks), add `nextCheckAt` to the `prisma.savedSearch.update` data:

```typescript
nextCheckAt: computeNextCheckAt(s.dateFrom),
```

This goes in both the one-way branch (line 124-135) and the round-trip branch (line 149-179).

#### Step 3.6: Set `nextCheckAt` on search creation

**File**: `backend/src/services/savedSearchService.ts`

In `createSavedSearch` (lines 64-171), after the initial search and price check succeeds, set `nextCheckAt`:

```typescript
nextCheckAt: computeNextCheckAt(data.dateFrom),
```

This ensures new searches are immediately scheduled into the adaptive system.

Export `computeNextCheckAt` from the worker/scheduler module so savedSearchService can import it.

#### Step 3.7: Reset `nextCheckAt` when a search is re-activated

**File**: `backend/src/services/savedSearchService.ts`

In `toggleSearchActive` (lines 290-314), when re-activating a search (`!search.active` becoming `true`), set `nextCheckAt` to `new Date()` (check immediately on next cron run):

```typescript
data: {
  active: !search.active,
  ...(!search.active && { nextCheckAt: new Date() }),
}
```

### Phase 4: Frontend Changes

These changes support the lazy hydration introduced in Phase 1.

#### Step 4.1: Detect and handle non-hydrated round-trip results

**File**: `frontend/app/search/[id].tsx`

The search detail screen currently expects `latestResults` to be `Combo[]` for round-trip searches. After Phase 1, `latestResults` from a cron-checked search will be `RoundTripRawOption[]` (has `outbound` and `price` but no `return`).

Add a detection check when the search data loads:

```typescript
// Detect if results need hydration (cron data vs full data)
const needsHydration = !isOneWay && search.latestResults.length > 0 &&
  !('return' in (search.latestResults[0] as any));
```

When `needsHydration` is true:
1. Show the results in a degraded mode (outbound info + total price, placeholder for return leg).
2. Automatically call the hydrate endpoint: `api.post(`/search/${id}/hydrate`)`.
3. When hydration completes, update the local state with the full `FlightCombo[]` data.
4. Show a subtle loading indicator during hydration (e.g., a small spinner in the header or an inline "Loading flight details..." message).

The hydration call should happen in the `fetchSearch` function (or a new `useEffect`) alongside the existing auto-refresh logic. **Hydration replaces auto-refresh for stale cron data** -- if the data is recent (checked within 5 minutes) but non-hydrated, hydrate it rather than doing a full refresh.

#### Step 4.2: Create a partial-data strip component

**File**: `frontend/src/components/FlightStrip.tsx`

Modify `RoundTripStrip` to handle the case where `item.return` is missing:

- The `Combo` interface (lines 45-50) needs a variant where `return` is optional. Add a new interface or make `return` optional:

```typescript
export interface PartialCombo {
  outbound: FlightLeg;
  totalPrice: number;
  nights: number;
  // No return leg -- will be hydrated later
}

export type ComboOrPartial = Combo | PartialCombo;
```

- In `RoundTripStrip`, check if `item.return` exists:
  - If yes: render as today (both `CompactLegRow` for outbound and return, full expanded detail).
  - If no: render outbound `CompactLegRow` only, show the total price, and display a placeholder for the return leg row (e.g., "Return: loading..." in muted text, or just show "Return TBD" with a subtle shimmer).
  - In the expanded accordion, if no return leg, show "Tap refresh for full flight details" instead of the return `ExpandedLeg`.
  - Disable the "Book on Google Flights" button when return leg is missing (we cannot build a deep link without return flight segments). Instead, show a fallback booking link that opens a generic Google Flights search URL.

- The `sameAirline` check (line 655) needs a guard: `const sameAirline = item.return ? item.outbound.airline === item.return.airline : true;`

#### Step 4.3: Update the search detail screen to call hydrate

**File**: `frontend/app/search/[id].tsx`

In `fetchSearch` (lines 394-425):

After loading the search data (line 397-398), check if hydration is needed:

```typescript
const data = res.data as SavedSearch;
setSearch(data);

// Check if round-trip data needs return-leg hydration
const isRoundTrip = data.tripType === "roundtrip";
const hasResults = Array.isArray(data.latestResults) && data.latestResults.length > 0;
const needsHydration = isRoundTrip && hasResults &&
  !('return' in (data.latestResults[0] as any));

if (needsHydration) {
  // Hydrate in background -- show partial data immediately
  try {
    const hydrateRes = await api.post(`/search/${id}/hydrate`);
    setSearch(hydrateRes.data);
  } catch {
    // Silently fail -- user still sees partial data with outbound + price
  }
}
```

This replaces the existing auto-refresh logic for the hydration case. Keep the existing auto-refresh for searches that ARE hydrated but stale (>5 min old).

Logic priority:
1. If `needsHydration` and data is recent (< 5 min): hydrate only (no full refresh).
2. If `needsHydration` and data is stale (> 5 min): do a full refresh (which returns hydrated data).
3. If already hydrated and stale: auto-refresh as before.
4. If already hydrated and fresh: do nothing.

#### Step 4.4: Add `needsHydration` state for UI feedback

**File**: `frontend/app/search/[id].tsx`

Add a state variable:

```typescript
const [hydrating, setHydrating] = useState(false);
```

Wrap the hydration call with this state. Use it to show a subtle inline indicator (e.g., in the bridge bar area or as a small banner above the results list):

```
"Loading return flight details..."
```

This should be unobtrusive -- the user already sees outbound legs and prices, so the hydration is incremental enhancement.

#### Step 4.5: Update TypeScript interfaces

**File**: `frontend/app/search/[id].tsx` (lines 44-65)

Update the `Combo` interface to support partial data:

```typescript
interface Combo {
  outbound: FlightLeg;
  return?: FlightLeg;   // Optional -- missing during hydration
  totalPrice: number;
  nights: number;
}
```

Similarly in `frontend/src/components/FlightStrip.tsx` (line 45-50) and `frontend/src/components/FlightResultCard.tsx` (line 43-48) -- all three files define their own local `Combo` interface.

**File**: `frontend/src/components/FlightStrip.tsx`

Update the `Combo` export (line 45):
```typescript
export interface Combo {
  outbound: FlightLeg;
  return?: FlightLeg;
  totalPrice: number;
  nights: number;
}
```

Update `RoundTripStrip` to handle missing `item.return`:
- Line 655: guard `sameAirline` check.
- Line 736: conditionally render return `CompactLegRow`.
- Lines 769-773: conditionally render return `ExpandedLeg`.
- Lines 776-780: conditionally render `RoundTripBookButton` (disable or show fallback when no return data).

## Files Affected

### Backend (new or modified)

| File | Change |
|------|--------|
| `backend/src/services/flightService.ts` | Add `fetchPriceOnly`, `hydrateReturnLegs`, `sampleDates` helper; add `sampleInterval` param to date generation |
| `backend/src/workers/priceCheckWorker.ts` | Use `fetchPriceOnly` instead of `searchByParams`; change cron to hourly; add `nextCheckAt` query filter and updates; add `computeNextCheckAt` |
| `backend/src/services/savedSearchService.ts` | Add `hydrateSearch` function; update `updateFilters` for raw option format; set `nextCheckAt` in `createSavedSearch` and `toggleSearchActive` |
| `backend/src/controllers/savedSearchController.ts` | Add `hydrateSearch` controller |
| `backend/src/routes/search.ts` | Add `POST /:id/hydrate` route |
| `backend/src/types/search.ts` | Rename `isLegacyRoundTripRawLegs` to `isRawOptionFormat`; update docs |
| `backend/prisma/schema.prisma` | Add `nextCheckAt` field and index |

### Frontend (modified)

| File | Change |
|------|--------|
| `frontend/app/search/[id].tsx` | Add hydration detection and auto-hydrate call; add `hydrating` state; update `Combo` interface |
| `frontend/src/components/FlightStrip.tsx` | Handle missing `item.return` in `RoundTripStrip`; update `Combo` interface |
| `frontend/src/components/FlightResultCard.tsx` | Update `Combo` interface (make `return` optional) -- this file may not need functional changes if FlightStrip is the primary display component |

### New files

None. All changes fit within existing files.

## Data Flow / Architecture

### Current flow (cron):
```
Cron -> searchByParams -> fetchAndReduceCombos
  -> searchRoundTrip (1 call per date pair, ~40 calls)
  -> buildCombosFromRawOptions -> fetchReturnLeg (1 call per top option, ~30 calls)
  -> Store FlightCombo[] in rawLegs + latestResults
```

### New flow (cron):
```
Cron -> fetchPriceOnly (sampleInterval: 3)
  -> searchRoundTrip (1 call per SAMPLED date pair, ~14 calls)
  -> Store RoundTripRawOption[] in rawLegs + latestResults
  -> Set nextCheckAt based on departure proximity
```

### New flow (user opens search detail):
```
Frontend loads search -> detects RoundTripRawOption[] (no return leg)
  -> POST /search/:id/hydrate
  -> Backend loads rawLegs, calls hydrateReturnLegs
    -> fetchReturnLeg for top 10 options (~10 calls)
  -> Store FlightCombo[] in rawLegs + latestResults
  -> Frontend updates UI with full data
```

### Manual refresh flow (unchanged):
```
User taps refresh -> POST /search/:id/refresh
  -> searchByParams (full, sampleInterval: 1)
  -> fetchAndReduceCombos (full, with return legs)
  -> Store FlightCombo[] as before
```

## Edge Cases & Error Handling

### Hydration failures
If the hydrate endpoint fails (SerpAPI error, timeout), the frontend shows partial data. The user can still see outbound legs and total prices. The "Book on Google Flights" button falls back to a generic search URL instead of a flight-specific deep link. No data is lost.

### Concurrent hydration requests
If multiple users open the same search simultaneously (possible with shared accounts or if the same user opens the app on multiple devices), both will call `/hydrate`. The second call will find the data already hydrated (via `isComboRawLegs` check) and return immediately without making API calls. This is safe.

### Cron overwrites hydrated data
If the cron runs between when a user hydrates a search and when they close the detail screen, the cron will overwrite `rawLegs` and `latestResults` with fresh `RoundTripRawOption[]` (un-hydrated). This is correct behavior -- the cron data is newer. Next time the user opens the search, it will be hydrated again.

### Sampling misses the cheapest date
Date sampling (every 3rd day) could theoretically miss a price anomaly on a specific date. This is acceptable for background monitoring where we are tracking price trends, not guaranteeing we catch every flash sale. When the user manually refreshes, the exhaustive search catches everything.

### Transition period / backward compatibility
Existing searches in the DB will have `nextCheckAt = null`. The cron query uses `OR: [{ nextCheckAt: null }, { nextCheckAt: { lte: now } }]` to pick these up immediately. After one cron cycle, all searches will have `nextCheckAt` set.

Existing `rawLegs` data may be in the old `FlightCombo[]` format. The `isComboRawLegs` and `isRawOptionFormat` type guards handle both formats correctly.

### One-way searches
One-way searches are unaffected by the return-leg skip (they have no return leg). Date sampling applies to one-way searches too -- apply `sampleInterval: 3` to `fetchAndReduceOneWay` during cron. Adaptive frequency applies equally to one-way searches.

### Expired searches that become active again
When a user re-activates a paused search, `nextCheckAt` is set to `new Date()` (immediate). The next hourly cron run will pick it up.

### `updateFilters` on non-hydrated data
When a user applies an airline filter to a non-hydrated search, the backend filters `RoundTripRawOption[]` by outbound airline only. This is imperfect (the return leg airline is unknown), but it is a reasonable approximation. The filter will be re-applied after hydration to catch both legs.

## Testing Considerations

1. **Unit test `computeNextCheckAt`**: Test with departure dates at 1, 3, 7, 14, 30, 60 days out. Verify correct interval selection.

2. **Unit test `sampleDates`**: Verify it selects every Nth date correctly, handles arrays shorter than the interval, handles empty arrays.

3. **Integration test: cron with `fetchPriceOnly`**: Mock SerpAPI, verify that `fetchReturnLeg` is NOT called during cron. Verify `rawLegs` contains `RoundTripRawOption[]`.

4. **Integration test: hydrate endpoint**: Start with `RoundTripRawOption[]` in DB. Call `/hydrate`. Verify `rawLegs` is now `FlightCombo[]` and `latestResults` contains full combos.

5. **Integration test: hydrate idempotency**: Call `/hydrate` on already-hydrated data. Verify no SerpAPI calls are made and the response is identical.

6. **Integration test: cron scheduling**: Create searches at different departure distances. Run one cron cycle. Verify `nextCheckAt` is set correctly per tier. Verify only due searches are processed on the next cycle.

7. **Frontend test: partial data rendering**: Mock a search response with `RoundTripRawOption[]` format (no `return` field on results). Verify the strip renders outbound info and price without crashing. Verify the return leg area shows a placeholder.

8. **E2E test: full lifecycle**: Create a search. Wait for cron (or trigger manually). Open the search detail. Verify hydration happens automatically. Verify full flight details appear after hydration.

## Migration / Breaking Changes

### Database migration
- One new nullable column: `next_check_at` (DateTime?) on `saved_searches`.
- One new index: `[active, next_check_at]`.
- No data migration needed -- existing rows will have `next_check_at = null`, which the cron handles as "check immediately".

### API changes
- New endpoint: `POST /search/:id/hydrate` -- additive, no breaking change.
- Existing `GET /search/:id` response shape changes: `latestResults` may now contain `RoundTripRawOption[]` instead of `FlightCombo[]`. The frontend must handle both formats. **This is the only potentially breaking change** if other clients consume this API.

### Cron schedule change
- Changes from every 4 hours to every 1 hour. This is a server-side configuration change with no client impact.

## Implementation Order

1. **Phase 1** (Skip return legs) -- highest impact, no schema changes, backend + frontend
2. **Phase 2** (Date sampling) -- backend only, compounds with Phase 1
3. **Phase 3** (Adaptive frequency) -- requires migration, backend only (no frontend changes)

Phases 1 and 2 can be implemented in a single PR. Phase 3 is best as a separate PR due to the schema migration.

## Open Questions

1. **Should the home screen (search list) show a "needs hydration" indicator?** Currently the home screen shows `cheapestPrice` and `resultCount`. Both are available from cron data. There is no visual indication that the detail view has partial data until you open it. This is probably fine -- the user does not need to know about the internal data format.

2. **Should hydration happen preemptively?** Instead of hydrating when the user opens the detail screen, we could hydrate when the user navigates to the home screen (prefetch the top 1-2 searches). This would eliminate the hydration delay but adds complexity and API calls. Recommend: skip this for now, optimize later if the hydration latency (fetching ~10 return legs) is noticeable.

3. **Cron timing randomization**: The current 2-second delay between groups (line 190 in priceCheckWorker) should be kept. Consider whether the hourly cron should add jitter (random 0-5 minute delay before starting) to avoid predictable patterns that SerpAPI might throttle.
