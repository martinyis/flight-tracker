# Implementation Plan: Advanced Filters + Credits System

## Summary

Replace the current tiered one-time payment model with a credits-based economy, and add API-level flight filters (stops, airlines, duration, bags) that are set at search creation time and passed to SerpAPI. Credits are spent when creating searches and when activating cron tracking. Filter changes require a new credited search -- there is no "re-search" prompt on the results page.

## Context & Problem

The current monetization model charges a one-time tiered fee ($1.99-$14.99) per search to unlock cron tracking. This is simple but inflexible -- it doesn't scale well with actual API costs and doesn't allow for incremental actions like re-searching with different filters.

Currently, zero filter parameters are passed to SerpAPI. The only filtering is post-hoc airline name toggling on cached results. Users cannot filter by stops, duration, or bags at the API level, which means they receive irrelevant results that waste API bandwidth.

## Chosen Approach

**Credits system with upfront pricing.** Users buy credit packs. Each action (search, tracking activation) has a known credit cost shown before the user commits. Credits are deducted atomically at the moment of action. Cron monitoring is paid upfront for the full 14-day window -- no per-day billing, no mid-tracking balance checks.

**API-level filters at search creation.** Filters are set once when creating a search and stored on the SavedSearch record. They are passed to every SerpAPI call (initial search, cron sentinel, cron full scan). To change filters, the user creates a new search (which costs credits). The results page retains local airline chip filtering for visual filtering of cached results only -- this is free and does not trigger API calls.

---

## 1. Database Schema Changes

### File: `backend/prisma/schema.prisma`

Drop the `Payment` model entirely. Add `CreditBalance` and `CreditTransaction` models. Add `creditBalance` field to `User`. Add `apiFilters` JSON column to `SavedSearch`. Remove `trackingFee`, `trackingPaid`, `trackingPaidAt` from `SavedSearch` (replaced by credit transactions). Add `searchCredits` and `trackingCredits` to `SavedSearch` so the UI can show what was charged.

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

model User {
  id            Int      @id @default(autoincrement())
  email         String   @unique
  password      String?
  googleId      String?  @unique @map("google_id")
  appleId       String?  @unique @map("apple_id")
  creditBalance Int      @default(0) @map("credit_balance")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  searches     SavedSearch[]
  transactions CreditTransaction[]

  @@map("users")
}

model SavedSearch {
  id                Int       @id @default(autoincrement())
  userId            Int       @map("user_id")
  tripType          String    @map("trip_type")
  origin            String
  destination       String
  dateFrom          String    @map("date_from")
  dateTo            String    @map("date_to")
  minNights         Int?      @map("min_nights")
  maxNights         Int?      @map("max_nights")
  active            Boolean   @default(true)
  lastCheckedAt     DateTime? @map("last_checked_at")
  cheapestPrice     Float?    @map("cheapest_price")
  latestResults     Json      @default("[]") @map("latest_results")
  filters           Json      @default("{}") @map("filters")
  apiFilters        Json      @default("{}") @map("api_filters")
  availableAirlines Json      @default("[]") @map("available_airlines")
  airlineLogos      Json      @default("{}") @map("airline_logos")
  rawLegs           Json      @default("{\"outbound\":[],\"return\":[]}") @map("raw_legs")
  priceHistory      Json      @default("[]") @map("price_history")
  nextCheckAt       DateTime? @map("next_check_at")
  trackingActive    Boolean   @default(false) @map("tracking_active")
  comboCount        Int?      @map("combo_count")
  sentinelPairs     Json      @default("[]") @map("sentinel_pairs")
  searchCredits     Int       @default(0) @map("search_credits")
  trackingCredits   Int       @default(0) @map("tracking_credits")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  user         User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions CreditTransaction[]

  @@index([active, dateTo])
  @@index([active, nextCheckAt])
  @@index([userId])
  @@index([userId, createdAt])
  @@map("saved_searches")
}

model CreditTransaction {
  id        Int      @id @default(autoincrement())
  userId    Int      @map("user_id")
  searchId  Int?     @map("search_id")
  amount    Int
  type      String
  note      String?
  createdAt DateTime @default(now()) @map("created_at")

  user   User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  search SavedSearch? @relation(fields: [searchId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([userId, type])
  @@map("credit_transactions")
}
```

### Key changes from current schema

1. **User**: Added `creditBalance` (Int, default 0). This is the single source of truth for current balance. It is always updated atomically alongside a `CreditTransaction` row inside a `prisma.$transaction()`.

2. **SavedSearch**:
   - **Added** `apiFilters` (Json) -- stores the SerpAPI-level filters set at creation time.
   - **Added** `trackingActive` (Boolean) -- replaces `trackingPaid`. Semantics: true means cron should monitor this search. Set to true when user spends tracking credits.
   - **Added** `searchCredits`, `trackingCredits` (Int) -- records what was charged for display purposes.
   - **Removed** `trackingPaid`, `trackingFee`, `trackingPaidAt` -- replaced by credits system.
   - **Kept** `filters` (Json) -- still used for local airline filtering on cached results.
   - **Kept** `active` (Boolean) -- user can still pause/resume tracking. `trackingActive` means "paid for", `active` means "currently running". User can pause an active tracked search.

3. **Payment model**: Deleted entirely. Replaced by `CreditTransaction`.

4. **CreditTransaction**: Ledger of all credit changes. `amount` is signed: positive = credits added (purchase, signup bonus), negative = credits spent (search, tracking). `type` is one of: `signup_bonus`, `purchase`, `search`, `tracking`, `refund`.

### Migration

Since there is no production data, use `prisma migrate reset` after updating the schema. No data migration needed.

---

## 2. API Filters Type System

### File: `backend/src/types/search.ts`

Add a new interface for API-level filters stored on SavedSearch and passed to SerpAPI.

```typescript
/** Filters passed to SerpAPI at query time. Stored on SavedSearch.apiFilters. */
export interface ApiFilters {
  /** 1=Nonstop, 2=1 stop or fewer, 3=2 stops or fewer */
  stops?: 1 | 2 | 3;
  /** IATA codes or alliance names to include. Mutually exclusive with excludeAirlines. */
  includeAirlines?: string[];
  /** IATA codes or alliance names to exclude. Mutually exclusive with includeAirlines. */
  excludeAirlines?: string[];
  /** Maximum flight duration in minutes */
  maxDuration?: number;
  /** Number of bags (1 = include carry-on pricing) */
  bags?: number;
}
```

The existing `SearchFilters` interface (local airline filter) stays unchanged. It continues to be used for the chip-based airline toggling on the results page.

### Validation rules (enforced in `savedSearchService.createSavedSearch`):

- `stops` must be 1, 2, or 3 if provided.
- `includeAirlines` and `excludeAirlines` are mutually exclusive. If both are provided, reject with 400.
- Airline values must be 2-letter IATA codes or one of: `STAR_ALLIANCE`, `SKYTEAM`, `ONEWORLD`.
- `maxDuration` must be a positive integer (minutes). Reasonable cap: 2880 (48 hours).
- `bags` must be 0 or 1.

---

## 3. Credits System

### Credit Cost Calculation

#### File: `backend/src/services/creditService.ts` (new file)

This module owns all credit math and balance operations.

**Search credit tiers** (based on combo count, ~1.5x API cost, rounded to nearest 5):

| Combo count | API calls (combos + 4 hydrations) | API cost | 1.5x cost | Credits (at $0.10 each) |
|---|---|---|---|---|
| 1-10 | 5-14 | $0.13-$0.35 | $0.19-$0.53 | **5** |
| 11-20 | 15-24 | $0.38-$0.60 | $0.56-$0.90 | **10** |
| 21-50 | 25-54 | $0.63-$1.35 | $0.94-$2.03 | **20** |
| 51-100 | 55-104 | $1.38-$2.60 | $2.06-$3.90 | **35** |
| 101-150 | 105-154 | $2.63-$3.85 | $3.94-$5.78 | **55** |
| 151-200 | 155-204 | $3.88-$5.10 | $5.81-$7.65 | **80** |

**Tracking credit tiers** (14 days of sentinel checks + expected 2 full scans):

| Combo count | Sentinel cost (14d, 56 calls) | Expected full scan cost (2 scans) | Total API cost | 1.5x | Credits |
|---|---|---|---|---|---|
| 1-10 | $1.40 | $0.25 | $1.65 | $2.48 | **25** |
| 11-20 | $1.40 | $0.75 | $2.15 | $3.23 | **35** |
| 21-50 | $1.40 | $2.00 | $3.40 | $5.10 | **55** |
| 51-100 | $1.40 | $4.00 | $5.40 | $8.10 | **85** |
| 101-150 | $1.40 | $6.50 | $7.90 | $11.85 | **120** |
| 151-200 | $1.40 | $10.00 | $11.40 | $17.10 | **175** |

**Functions to implement in `creditService.ts`:**

```
computeSearchCredits(comboCount: number): number
```
Returns the search credit cost for a given combo count using the tier table above.

```
computeTrackingCredits(comboCount: number): number
```
Returns the tracking credit cost for a given combo count using the tier table above.

```
getBalance(userId: number): Promise<number>
```
Reads `user.creditBalance` from the database. Single source of truth.

```
deductCredits(userId: number, amount: number, type: string, searchId?: number, note?: string): Promise<void>
```
Inside a `prisma.$transaction()`:
1. Read `user.creditBalance` with a `SELECT ... FOR UPDATE` (use `prisma.$queryRaw` for the lock, or use Prisma's interactive transaction with serializable isolation).
2. If balance < amount, throw error with status 402 and code `INSUFFICIENT_CREDITS`.
3. Decrement `user.creditBalance` by `amount`.
4. Create `CreditTransaction` with negative `amount` (-amount), type, searchId, note.

```
addCredits(userId: number, amount: number, type: string, note?: string): Promise<void>
```
Inside a `prisma.$transaction()`:
1. Increment `user.creditBalance` by `amount`.
2. Create `CreditTransaction` with positive `amount`, type, note.

```
grantSignupBonus(userId: number): Promise<void>
```
Calls `addCredits(userId, 50, 'signup_bonus', 'Welcome bonus')`. Called from `authService` during registration.

```
refundCredits(userId: number, amount: number, searchId: number, note: string): Promise<void>
```
Calls `addCredits` with type `refund` and the searchId. Used when a search fails after credits were deducted.

### Concurrency safety

The `deductCredits` function must use serializable isolation or row-level locking to prevent double-spend. The recommended approach with Prisma 7:

```typescript
await prisma.$transaction(async (tx) => {
  const user = await tx.user.findUniqueOrThrow({
    where: { id: userId },
    select: { creditBalance: true },
  });
  if (user.creditBalance < amount) {
    throw Object.assign(new Error(`Insufficient credits. Need ${amount}, have ${user.creditBalance}.`), {
      status: 402,
      code: 'INSUFFICIENT_CREDITS',
      needed: amount,
      balance: user.creditBalance,
    });
  }
  await tx.user.update({
    where: { id: userId },
    data: { creditBalance: { decrement: amount } },
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
}, { isolationLevel: 'Serializable' });
```

---

## 4. Search Creation with API Filters and Credit Deduction

### File: `backend/src/services/savedSearchService.ts`

#### Changes to `createSavedSearch()`

The function signature changes to accept `apiFilters`:

```typescript
interface CreateSearchInput {
  tripType: TripType;
  origin: string;
  destination: string;
  dateFrom: string;
  dateTo: string;
  minNights?: number;
  maxNights?: number;
  apiFilters?: ApiFilters;
}
```

**New flow (replacing the old free-preview + payment flow):**

1. Validate all inputs (existing validation stays).
2. Validate `apiFilters` if provided (see validation rules in section 2).
3. Compute combo count (existing logic).
4. Enforce 200 combo hard cap (existing).
5. Compute search credit cost via `computeSearchCredits(comboCount)`.
6. **Deduct credits** via `deductCredits(userId, searchCredits, 'search', null, 'Search: LAX->JFK ...')`. If insufficient, the function throws 402 which the controller returns to the client. Note: `searchId` is null at this point because the search hasn't been created yet. The transaction record is updated after search creation (see step 9).
7. Create the `SavedSearch` record with `apiFilters` stored, `searchCredits` recorded, `trackingActive: false`, `active: false`.
8. Run the SerpAPI search (full combo range -- no more free preview cap). Pass `apiFilters` to all SerpAPI calls. If the search **fails**, refund credits via `refundCredits()` and delete the SavedSearch record.
9. Update the `CreditTransaction` to set `searchId` now that the search exists.
10. Return the search with results.

**What gets removed:**
- `FREE_COMBO_CAP` constant and `clampDateToForPreview()` function -- deleted. Every search now searches the full date range because the user is paying credits.
- `computeTrackingFee()` function -- deleted (replaced by `creditService.computeTrackingCredits()`).
- `FREE_SEARCHES_PER_DAY` check -- deleted. Credits are the rate limiter now.
- 24h dedup check -- **kept**. This prevents accidental duplicate searches that waste credits. But instead of silently returning the existing search, throw a 409 with the existing search ID so the frontend can navigate to it. This way the user doesn't lose credits.

#### Changes to `activateTracking()`

**New flow:**

1. Load search, verify ownership.
2. If `trackingActive` is already true, return error 400.
3. Compute tracking credit cost via `computeTrackingCredits(comboCount)`.
4. Deduct credits via `deductCredits(userId, trackingCredits, 'tracking', searchId, 'Tracking: LAX->JFK ...')`.
5. Set `trackingActive: true`, `active: true`, compute `nextCheckAt`, compute `sentinelPairs`.
6. No SerpAPI calls here -- the search already has fresh data from creation. Cron picks it up on next run.
7. Record `trackingCredits` on the SavedSearch for display.
8. Return updated search.

**What gets removed:**
- The `wasCapped` branch that re-runs the full search after payment -- deleted. Searches are always full now.
- Payment model creation -- deleted.
- `trackingFee` references -- deleted.

#### Changes to `refreshSearch()`

The `refreshSearch` function currently gates on `trackingPaid`. Change to gate on `trackingActive`:

```typescript
if (!search.trackingActive) {
  throw Object.assign(
    new Error("Tracking not activated. Activate tracking to enable price monitoring."),
    { status: 402, code: 'TRACKING_REQUIRED' }
  );
}
```

The 8-hour refresh minimum interval stays unchanged.

When `refreshSearch` runs, it must pass the stored `apiFilters` to SerpAPI (see section 6).

#### `updateFilters()` -- local airline filter

This function stays exactly as-is. It applies airline filters to cached results without any API calls, costs zero credits. The `filters` column on SavedSearch continues to store the local airline selection.

#### `deleteSearch()` -- no refund

Deleting a search does not refund credits. The API calls have already been made. This is a deliberate design choice.

---

## 5. Passing API Filters to SerpAPI

### File: `backend/src/services/flightService.ts`

All SerpAPI-calling functions need to accept and forward `ApiFilters`.

#### Changes to `searchRoundTrip()`

Add `apiFilters?: ApiFilters` parameter. Before making the API call, conditionally append filter params:

```typescript
async function searchRoundTrip(
  origin: string,
  destination: string,
  outboundDate: string,
  returnDate: string,
  apiFilters?: ApiFilters
): Promise<RoundTripRawOption[]> {
  const params = new URLSearchParams({
    engine: "google_flights",
    departure_id: origin,
    arrival_id: destination,
    outbound_date: outboundDate,
    return_date: returnDate,
    type: "1",
    currency: "USD",
    hl: "en",
    api_key: process.env.SERPAPI_KEY!,
  });

  // Apply API-level filters
  if (apiFilters?.stops) {
    params.set("stops", String(apiFilters.stops));
  }
  if (apiFilters?.includeAirlines?.length) {
    params.set("include_airlines", apiFilters.includeAirlines.join(","));
  }
  if (apiFilters?.excludeAirlines?.length) {
    params.set("exclude_airlines", apiFilters.excludeAirlines.join(","));
  }
  if (apiFilters?.maxDuration) {
    params.set("max_duration", String(apiFilters.maxDuration));
  }
  if (apiFilters?.bags != null) {
    params.set("bags", String(apiFilters.bags));
  }

  // ... rest of function unchanged
}
```

#### Same pattern for:
- `searchOneWay()` -- add `apiFilters` param, append to URLSearchParams.
- `fetchReturnLeg()` -- add `apiFilters` param, append to URLSearchParams. Return leg searches should use the same filters.

#### Functions that call these and need to thread `apiFilters` through:
- `fetchAndReduceCombos()` -- add `apiFilters` to `SearchParams`, pass to `searchRoundTrip()` and `buildCombosFromRawOptions()`.
- `searchByParams()` -- threads through to `fetchAndReduceCombos()`.
- `fetchPriceOnly()` -- used by cron. Must accept and forward `apiFilters`.
- `fetchOneWayPriceOnly()` -- used by cron. Must accept and forward `apiFilters`.
- `fetchSentinelPrices()` -- used by cron sentinel check. Must accept and forward `apiFilters`.
- `buildCombosFromRawOptions()` -- calls `fetchReturnLeg()`, must forward `apiFilters`.
- `hydrateReturnLegs()` -- calls `buildCombosFromRawOptions()`, must forward `apiFilters`.

The `apiFilters` field on `SearchParams` and `OneWaySearchParams` interfaces:

```typescript
export interface SearchParams {
  origin: string;
  destination: string;
  dateFrom: string;
  dateTo: string;
  minNights: number;
  maxNights: number;
  filters?: SearchFilters;      // local airline filter (existing)
  apiFilters?: ApiFilters;      // SerpAPI-level filters (new)
}

export interface OneWaySearchParams {
  origin: string;
  destination: string;
  dateFrom: string;
  dateTo: string;
  filters?: SearchFilters;
  apiFilters?: ApiFilters;
}
```

#### Helper: `applySerpApiFilters(params: URLSearchParams, apiFilters?: ApiFilters)`

To avoid repeating the filter-appending logic in every function, extract it into a helper:

```typescript
function applySerpApiFilters(params: URLSearchParams, apiFilters?: ApiFilters): void {
  if (!apiFilters) return;
  if (apiFilters.stops) params.set("stops", String(apiFilters.stops));
  if (apiFilters.includeAirlines?.length) {
    params.set("include_airlines", apiFilters.includeAirlines.join(","));
  }
  if (apiFilters.excludeAirlines?.length) {
    params.set("exclude_airlines", apiFilters.excludeAirlines.join(","));
  }
  if (apiFilters.maxDuration) params.set("max_duration", String(apiFilters.maxDuration));
  if (apiFilters.bags != null) params.set("bags", String(apiFilters.bags));
}
```

Call this in `searchRoundTrip()`, `searchOneWay()`, and `fetchReturnLeg()`.

---

## 6. Cron Worker Changes

### File: `backend/src/workers/priceCheckWorker.ts`

#### Loading API filters

When the cron worker loads active searches, it already loads the full `SavedSearch` record. The `apiFilters` JSON column is now available on each search.

Change the query filter from `trackingPaid: true` to `trackingActive: true`:

```typescript
const searches = await prisma.savedSearch.findMany({
  where: {
    active: true,
    trackingActive: true,   // was: trackingPaid: true
    dateTo: { gte: today },
    OR: [
      { nextCheckAt: null },
      { nextCheckAt: { lte: now } },
    ],
  },
});
```

#### Passing filters to SerpAPI calls

The cron worker currently calls `fetchSentinelPrices()`, `fetchPriceOnly()`, and `fetchOneWayPriceOnly()`. Each of these needs the search's `apiFilters` passed through.

**For deduplicated groups:** Currently, searches are deduped by route + dates + nights. API filters must now be part of the dedup key, because two searches for the same route but different filters need separate API calls.

Change the dedup key to include a serialized `apiFilters`:

```typescript
const apiFiltersKey = JSON.stringify(s.apiFilters ?? {});
const key =
  tripType === "oneway"
    ? `oneway|${s.origin}|${s.destination}|${s.dateFrom}|${s.dateTo}|${apiFiltersKey}`
    : `roundtrip|${s.origin}|${s.destination}|${s.dateFrom}|${s.dateTo}|${s.minNights}|${s.maxNights}|${apiFiltersKey}`;
```

Add `apiFilters` to the `DedupGroup` interface:

```typescript
interface DedupGroup {
  tripType: TripType;
  params: {
    origin: string;
    destination: string;
    dateFrom: string;
    dateTo: string;
    minNights?: number;
    maxNights?: number;
  };
  apiFilters: ApiFilters;
  searchIds: number[];
}
```

Pass `group.apiFilters` to every SerpAPI call the cron makes:
- `fetchSentinelPrices(origin, destination, sentinelPairs, group.apiFilters)`
- `fetchPriceOnly({ ...group.params, apiFilters: group.apiFilters, sampleInterval: 1 })`
- `fetchOneWayPriceOnly({ ...group.params, apiFilters: group.apiFilters, sampleInterval: 1 })`

#### No balance checks

The cron worker does **not** check credit balances before running. Tracking credits were paid upfront when the user activated tracking. The cron runs unconditionally for all `trackingActive: true, active: true` searches until they expire.

---

## 7. "Re-search with New Filters" Flow

There is no "re-search" action. If a user wants different API-level filters, they create a brand new search. The flow is:

1. User goes to the add-search screen.
2. User fills in route + dates + nights + API filters.
3. User taps "Search Flights" -- credits are deducted, new search is created.
4. User navigates to the new search's results page.
5. If the old search is no longer wanted, user deletes it manually.

This is the simplest possible design. No special "re-search" endpoint, no linking of old and new searches, no partial refunds.

The results page does **not** show a "search again with different filters" prompt. If the user wants different filters, they go back to the add-search screen.

---

## 8. Local Filter Toggling on Results Page

### File: `frontend/app/search/[id].tsx`

The existing airline chip filter row stays. It calls `PATCH /search/:id/filters` which runs `updateFilters()` -- pure in-memory re-filtering of cached results, zero API calls, zero credits.

**What changes:**
- The airline chips now only filter within the results that the API-level filters already returned. For example, if the user searched with `includeAirlines: ['UA', 'DL']`, the chips will only show United and Delta. This is expected behavior -- the chips are a visual refinement of what's already cached.

**What does NOT change:**
- No new UI for local stops/duration/bags filtering on the results page. These are API-level only. The user picked them at search creation and they're baked into the results.

---

## 9. Free Credits on Signup

### File: `backend/src/services/authService.ts`

At the end of every user creation path (email registration, first-time Google login, first-time Apple login), call:

```typescript
import { grantSignupBonus } from "./creditService";

// After creating the user:
await grantSignupBonus(user.id);
```

Specifically, add this call in:
- `registerUser()` -- after `prisma.user.create()`.
- `googleAuth()` -- in the "Case 3: brand new user" branch, after `prisma.user.create()`.
- `appleAuth()` -- in the "Case 3: brand new user" branch, after `prisma.user.create()`.

The `grantSignupBonus` function creates a `CreditTransaction` with `type: 'signup_bonus'` and `amount: 50`, and increments `user.creditBalance` by 50.

**What 50 credits buys:**
- One small search (5 credits) + tracking (25 credits) = 30 credits used, 20 remaining.
- The remaining 20 credits can fund a second small search (5) + tracking (25) -- just barely short. This is intentional: the user gets one complete tracked search for free and can do a second search preview, which nudges them toward purchasing credits if they want to track it.

---

## 10. API Endpoints

### New endpoints

#### `GET /api/credits/balance`

Returns the user's current credit balance and recent transactions.

**File:** `backend/src/routes/credits.ts` (new file)
**Controller:** `backend/src/controllers/creditsController.ts` (new file)

Response:
```json
{
  "balance": 42,
  "transactions": [
    { "id": 1, "amount": 50, "type": "signup_bonus", "note": "Welcome bonus", "createdAt": "..." },
    { "id": 2, "amount": -5, "type": "search", "searchId": 1, "note": "Search: LAX to JFK", "createdAt": "..." }
  ]
}
```

Returns the 20 most recent transactions, ordered by `createdAt` desc.

#### `POST /api/credits/purchase`

Simulated credit purchase (real IAP integration later).

Request body:
```json
{
  "packId": "starter"
}
```

Valid `packId` values and their credit amounts:
- `starter`: 50 credits, $4.99
- `standard`: 150 credits, $12.99
- `pro`: 400 credits, $29.99
- `power`: 1000 credits, $59.99

Response:
```json
{
  "balance": 92,
  "creditsAdded": 50,
  "transaction": { "id": 3, "amount": 50, "type": "purchase", "note": "Starter pack", "createdAt": "..." }
}
```

For now this always succeeds (simulated). When real IAP is integrated, this endpoint will verify the App Store receipt before granting credits.

#### `GET /api/credits/cost`

Pre-flight endpoint: given search params, returns the credit cost without actually creating the search. Used by the frontend to show "This search will cost X credits" before the user commits.

Query params: `tripType`, `dateFrom`, `dateTo`, `minNights`, `maxNights` (same as search creation).

Response:
```json
{
  "comboCount": 45,
  "searchCredits": 20,
  "trackingCredits": 55,
  "totalCredits": 75,
  "balance": 42,
  "canAffordSearch": true,
  "canAffordSearchAndTracking": false
}
```

### Modified endpoints

#### `POST /api/search` (create search)

Request body now includes `apiFilters`:
```json
{
  "tripType": "roundtrip",
  "origin": "LAX",
  "destination": "JFK",
  "dateFrom": "2026-04-01",
  "dateTo": "2026-04-15",
  "minNights": 3,
  "maxNights": 7,
  "apiFilters": {
    "stops": 1,
    "includeAirlines": ["UA", "DL"],
    "maxDuration": 480,
    "bags": 1
  }
}
```

Response now includes credit info:
```json
{
  "search": { ... },
  "creditsCharged": 20,
  "remainingBalance": 22
}
```

New error response for insufficient credits (HTTP 402):
```json
{
  "error": "Insufficient credits. Need 20, have 12.",
  "code": "INSUFFICIENT_CREDITS",
  "needed": 20,
  "balance": 12
}
```

#### `POST /api/search/:id/activate-tracking`

Response now includes credit info:
```json
{
  "search": { ... },
  "creditsCharged": 55,
  "remainingBalance": 17
}
```

Same 402 error shape for insufficient credits.

#### `GET /api/search` (list searches)

Response for each search now includes `searchCredits`, `trackingCredits`, `trackingActive` instead of `trackingPaid`, `trackingFee`.

#### `GET /api/search/:id` (search detail)

Response now includes `apiFilters`, `searchCredits`, `trackingCredits`, `trackingActive`.

### Removed endpoints

None removed, but the semantics of `POST /api/search/:id/activate-tracking` change (credits instead of payment).

### Route registration

#### File: `backend/src/index.ts`

Add the credits routes:

```typescript
import creditsRoutes from "./routes/credits";

app.use("/api/credits", authenticate, creditsRoutes);
```

---

## 11. Frontend Changes

### 11.1 Credits Context

#### File: `frontend/src/context/CreditsContext.tsx` (new file)

A React context that holds the user's credit balance and provides methods to refresh it. Similar pattern to `AuthContext`.

```typescript
interface CreditsState {
  balance: number | null;  // null = not yet loaded
  isLoading: boolean;
  refresh: () => Promise<void>;
}
```

The context fetches balance on mount and exposes a `refresh()` method that screens call after credit-spending actions.

Wrap the app with `<CreditsProvider>` inside `<AuthProvider>`. Only fetches when the user is authenticated.

### 11.2 Credits Display

#### File: `frontend/src/components/CreditsBadge.tsx` (new file)

A small component that shows the current credit balance. Displayed in the top-right of the home screen header.

Visual: pill-shaped badge with a coin/credit icon and the number. Example: `[C] 42`.

Tapping it navigates to a credits detail screen.

### 11.3 Credits Screen

#### File: `frontend/app/credits.tsx` (new file)

Full-screen credits management:
- Current balance (large, prominent).
- Purchase buttons for each credit pack (Starter/Standard/Pro/Power).
- Transaction history list (scrollable, showing recent debits and credits).

### 11.4 Add Search Screen -- Advanced Filters

#### File: `frontend/app/add-search.tsx`

**New UI section:** "Advanced Filters" collapsible section below the nights card (for round-trip) or dates card (for one-way).

**Trigger:** A subtle "Filters" button/link. Tapping it expands the section with `LayoutAnimation`.

**Filter controls:**

1. **Stops** -- Segmented control with 3 options: "Any", "Nonstop", "1 stop or fewer". Maps to `stops: undefined | 1 | 2`.
   - "2 stops or fewer" (value 3) is omitted because it's effectively "Any" for most routes.

2. **Airlines** -- Two modes via a toggle: "Include" or "Exclude". Below the toggle, a text input where user types IATA codes (e.g., "UA, DL, AA"). Validated as 2-letter uppercase codes.
   - Alliance shortcuts: three tappable pills "Star Alliance", "SkyTeam", "oneworld" that auto-fill the code field.
   - For MVP, free-text IATA code entry is sufficient. A searchable airline picker can come later.

3. **Max Duration** -- Stepper or slider showing hours:minutes. Stored as minutes. Options: "Any", or specific values from a preset list (4h, 6h, 8h, 10h, 12h, 16h, 24h). Alternatively, a stepper that increments by 30 minutes. Recommend the preset list for simplicity.

4. **Carry-on Included** -- Simple toggle switch. Maps to `bags: 1` when on, `bags: undefined` when off.

**State management:**

Add to `WizardFormData` type in `frontend/src/types/wizard.ts`:
```typescript
interface WizardFormData {
  // ... existing fields
  apiFilters: {
    stops?: 1 | 2;
    airlineMode?: 'include' | 'exclude';
    airlines?: string;  // comma-separated IATA codes as entered by user
    maxDuration?: number;  // minutes
    bags?: boolean;
  };
}
```

Default: all filters are "off" / "Any" (empty `apiFilters` object).

**Credit cost display:**

Replace the current combo counter/tracking fee display with credit cost information.

Current text: `"Preview: 15 of 45 combos -- Tracking: $3.99"`

New text: `"45 combinations -- Search: 20 credits -- Track: 55 credits"`

This requires calling `GET /api/credits/cost` (or computing locally using the same tier table). Recommend **local computation** to avoid an API call on every form change. Mirror the `computeSearchCredits()` and `computeTrackingCredits()` functions in a shared utility or duplicate the simple tier lookup in the frontend.

**Insufficient credits warning:**

If the user's balance (from `CreditsContext`) is less than the search cost, show a warning below the credit cost display: `"Not enough credits (have 12, need 20)"` with a "Buy Credits" button that navigates to the credits screen.

**Search button behavior:**

When tapped:
1. Show the `SearchingOverlay` (existing).
2. POST to `/api/search` with `apiFilters` included in the body.
3. On 402 (insufficient credits): show error with "Buy Credits" CTA.
4. On success: navigate to the search detail page.

**What gets removed from add-search.tsx:**
- The `getTrackingFee()` function and all tracking fee display text.
- The `FREE_COMBO_CAP` constant (no more free preview concept).

### 11.5 Search Detail Screen

#### File: `frontend/app/search/[id].tsx`

**Changes to the hero card:**

Replace the "Activate Tracking -- $X.XX" button with "Activate Tracking -- XX credits". Same visual treatment (prominent CTA), different label.

When tapped:
1. POST to `/api/search/:id/activate-tracking`.
2. On 402 (insufficient credits): show alert with balance info and option to navigate to credits screen.
3. On success: update search state, refresh credits context.

**Active API filters display:**

Below the route info in the hero card, show small pills for any active API filters:
- "Nonstop" pill (if stops=1)
- "UA, DL" pill (if includeAirlines set)
- "Max 8h" pill (if maxDuration set)
- "Carry-on" pill (if bags=1)

These are read-only indicators. Tapping them does nothing (or shows a tooltip explaining "Create a new search to change filters").

**Airline chip row:**

Stays exactly as-is. This is local filtering of cached results. The chips show airlines that appeared in the (already API-filtered) results. Toggling chips calls `PATCH /search/:id/filters` -- zero credits, zero API calls.

**What gets removed:**
- The tracking fee display and payment simulation.
- The 402 handler that showed "Pay $X.XX to activate tracking" -- replaced with credit-based messaging.

### 11.6 Home Screen

#### File: `frontend/app/index.tsx`

**Changes:**
- Add `CreditsBadge` component to the header area (top-right).
- In the `SavedSearchSummary` interface: replace `trackingPaid` and `trackingFee` with `trackingActive`, `searchCredits`, `trackingCredits`.
- The FlightPanel component does not change visually -- it already shows `active`/paused status which is independent of the credits system.

### 11.7 Type Updates

#### File: `frontend/src/types/wizard.ts`

Add `apiFilters` to `WizardFormData` as described in 11.4.

#### Various frontend files

Update `SavedSearch` and `SavedSearchSummary` interfaces to reflect schema changes:
- Remove `trackingPaid`, `trackingFee`.
- Add `trackingActive`, `searchCredits`, `trackingCredits`, `apiFilters`.

---

## 12. Edge Cases & Error Handling

### Insufficient credits at search time
- `savedSearchService.createSavedSearch()` calls `deductCredits()` before creating the search.
- If balance is insufficient, `deductCredits()` throws with status 402, code `INSUFFICIENT_CREDITS`.
- Controller returns 402 to frontend.
- Frontend shows error with balance info and "Buy Credits" CTA.
- No search record is created. No API calls are made.

### SerpAPI failure after credit deduction
- Credits are deducted before the SerpAPI search runs.
- If the search fails (SerpAPI error, timeout, etc.), the catch block in `createSavedSearch()` calls `refundCredits()` to return the search credits.
- The half-created SavedSearch record is deleted.
- Frontend receives an error and shows a retry message.

### Concurrent search creation (double-tap)
- The `deductCredits()` function uses serializable isolation. If two requests race, one will succeed and the other will fail with a serialization error or insufficient balance.
- The 24h dedup check also prevents truly identical concurrent searches.

### User runs out of credits mid-tracking
- **This cannot happen.** Tracking credits are paid upfront. The cron worker does not check balances. Once `trackingActive: true`, the search is monitored until expiration regardless of the user's current balance.

### Sentinel detects price change -- who pays for the full scan?
- **No one pays extra.** The tracking credit price was calculated to include the expected cost of ~2 full scans over 14 days. If more full scans are needed, that's absorbed as operational cost. The 50% margin provides a buffer. In rare worst-case scenarios (price changes every single day = 14 full scans), the cost would exceed the tracking credits collected. This is acceptable because it's statistically rare and the margin on normal operations covers the occasional loss.

### Tracking activation after search creation
- The user can create a search (costs search credits), view results, and decide not to activate tracking. The search credits are not refunded. The search stays in the list as a one-time snapshot with `trackingActive: false`, `active: false`.

### Deleting a search
- No credit refund on deletion. API calls were already made.
- If `trackingActive: true`, cron stops monitoring (because the record is deleted).

### Credit purchase failure (future IAP)
- Currently simulated (always succeeds). When real IAP is integrated, the purchase endpoint will verify the App Store receipt before granting credits. If verification fails, no credits are added.

### Negative balance protection
- The `deductCredits()` function checks `balance >= amount` inside a serializable transaction. The balance can never go negative.

### Zero-cost searches
- If `comboCount` somehow computes to 0 (shouldn't happen with valid dates), set a minimum search cost of 1 credit.

---

## 13. Files Affected

### New files
| File | Purpose |
|---|---|
| `backend/src/services/creditService.ts` | Credit balance management, cost calculation, transaction ledger |
| `backend/src/controllers/creditsController.ts` | HTTP handlers for credit endpoints |
| `backend/src/routes/credits.ts` | Express router for `/api/credits/*` |
| `frontend/src/context/CreditsContext.tsx` | React context for credit balance state |
| `frontend/src/components/CreditsBadge.tsx` | Header badge showing credit balance |
| `frontend/app/credits.tsx` | Credits management screen (balance, purchase, history) |

### Modified files
| File | Changes |
|---|---|
| `backend/prisma/schema.prisma` | New schema (CreditTransaction, User.creditBalance, SavedSearch changes) |
| `backend/src/types/search.ts` | Add `ApiFilters` interface, update `TypedSavedSearch` |
| `backend/src/services/flightService.ts` | Thread `apiFilters` through all SerpAPI-calling functions, add `applySerpApiFilters()` helper |
| `backend/src/services/savedSearchService.ts` | Credit deduction in create/activate, remove free preview, remove payment model, accept `apiFilters` |
| `backend/src/services/authService.ts` | Call `grantSignupBonus()` on new user creation |
| `backend/src/workers/priceCheckWorker.ts` | Change `trackingPaid` to `trackingActive`, include `apiFilters` in dedup key, pass `apiFilters` to SerpAPI calls |
| `backend/src/controllers/savedSearchController.ts` | Update error handling for 402 credit errors, return credit info in responses |
| `backend/src/routes/search.ts` | No route changes (endpoints stay the same) |
| `backend/src/index.ts` | Register `/api/credits` routes |
| `frontend/app/add-search.tsx` | Advanced filters UI, credit cost display, remove tracking fee display |
| `frontend/app/search/[id].tsx` | Credit-based tracking activation, API filter pills display |
| `frontend/app/index.tsx` | CreditsBadge in header, updated type interfaces |
| `frontend/src/components/FlightPanel.tsx` | Update `FlightPanelData` interface (trackingActive replaces trackingPaid) |
| `frontend/src/context/AuthContext.tsx` | No changes (credits context is separate) |
| `frontend/src/types/wizard.ts` | Add `apiFilters` to `WizardFormData` |

### Deleted code (within modified files)
| Location | What to remove |
|---|---|
| `backend/src/services/savedSearchService.ts` | `FREE_COMBO_CAP`, `clampDateToForPreview()`, `computeTrackingFee()`, `FREE_SEARCHES_PER_DAY` check, Payment model references, `trackingPaid`/`trackingFee` logic |
| `backend/prisma/schema.prisma` | `Payment` model |
| `frontend/app/add-search.tsx` | `getTrackingFee()`, `COMBO_HARD_CAP` constant (move to shared), tracking fee display text |

---

## 14. Implementation Order

These steps should be executed in dependency order:

### Phase 1: Schema + Credits Foundation
1. Update `backend/prisma/schema.prisma` with the new schema.
2. Run `npx prisma migrate reset` to apply.
3. Create `backend/src/services/creditService.ts` with all credit functions.
4. Create `backend/src/controllers/creditsController.ts` and `backend/src/routes/credits.ts`.
5. Register credits routes in `backend/src/index.ts`.
6. Update `backend/src/services/authService.ts` to grant signup bonus.

### Phase 2: API Filters in SerpAPI Calls
7. Add `ApiFilters` interface to `backend/src/types/search.ts`.
8. Add `applySerpApiFilters()` helper to `backend/src/services/flightService.ts`.
9. Thread `apiFilters` through `searchRoundTrip()`, `searchOneWay()`, `fetchReturnLeg()`.
10. Thread `apiFilters` through all wrapper functions (`fetchAndReduceCombos`, `searchByParams`, `fetchPriceOnly`, `fetchOneWayPriceOnly`, `fetchSentinelPrices`, `buildCombosFromRawOptions`, `hydrateReturnLegs`).

### Phase 3: Search Creation + Tracking with Credits
11. Rewrite `createSavedSearch()` in `savedSearchService.ts` -- remove free preview, add credit deduction, accept `apiFilters`.
12. Rewrite `activateTracking()` -- credit deduction instead of payment.
13. Update `refreshSearch()` -- gate on `trackingActive`, pass `apiFilters` to SerpAPI.
14. Update `getUserSearches()` and `getSearchById()` -- return new fields.
15. Delete `computeTrackingFee()`, `FREE_COMBO_CAP`, `clampDateToForPreview()`.
16. Update `savedSearchController.ts` -- return credit info, handle 402 errors.

### Phase 4: Cron Worker
17. Update `priceCheckWorker.ts` -- `trackingActive` gate, `apiFilters` in dedup key, pass `apiFilters` to all SerpAPI calls.

### Phase 5: Frontend -- Credits Infrastructure
18. Create `CreditsContext.tsx`.
19. Create `CreditsBadge.tsx`.
20. Create `credits.tsx` screen.
21. Wrap app with `CreditsProvider`.

### Phase 6: Frontend -- Advanced Filters + Search Flow
22. Update `WizardFormData` type in `wizard.ts`.
23. Add advanced filters UI section to `add-search.tsx`.
24. Replace tracking fee display with credit cost display.
25. Update search submission to include `apiFilters`.
26. Handle 402 errors with "Buy Credits" CTA.

### Phase 7: Frontend -- Search Detail
27. Update `SavedSearch` interfaces across frontend files.
28. Update search detail screen -- credit-based tracking button, API filter pills.
29. Update FlightPanel component -- `trackingActive` instead of `trackingPaid`.

---

## 15. Testing Considerations

### Backend unit tests
- `creditService.ts`: Test all credit functions, especially `deductCredits()` with insufficient balance, concurrent deductions (two requests racing), and the signup bonus idempotency.
- `savedSearchService.ts`: Test that search creation deducts the correct number of credits per tier, that SerpAPI failure triggers a refund, that 24h dedup returns 409.
- `priceCheckWorker.ts`: Test that API filters are included in the dedup key, that `trackingActive` gate works.

### Integration tests
- Full flow: register (get 50 credits) -> create search (deduct search credits) -> activate tracking (deduct tracking credits) -> verify cron picks it up.
- Insufficient credits: try to create a search with 0 balance, verify 402.
- API filters: create a search with `stops=1`, verify the SerpAPI URLSearchParams include `stops=1`.

### Frontend smoke tests
- Advanced filters section expands/collapses.
- Credit cost updates as combo count changes.
- "Not enough credits" warning appears when balance is insufficient.
- Credit purchase (simulated) adds to balance.
- Tracking activation deducts credits and updates UI.

---

## 16. Open Questions

1. **Airline code validation**: Should the backend validate that IATA codes in `includeAirlines`/`excludeAirlines` are real airline codes? Or just check format (2 uppercase letters) and let SerpAPI handle invalid codes silently? Recommendation: format check only. SerpAPI will return empty results for bogus codes, which is acceptable UX.

2. **Credit pack pricing finalization**: The pack prices ($4.99-$59.99) are placeholders that work for simulated payments. When integrating real IAP, these must exactly match App Store Connect product prices. Apple requires specific price tiers.

3. **Credit expiration**: Should credits expire? Currently no expiration is planned. If this is needed later, add an `expiresAt` field to `CreditTransaction` and a background job to expire old credits. Skip for MVP.

4. **Tracking duration**: Currently hardcoded at 14 days. Should this be configurable per search? The credit pricing is calibrated to 14 days. If made configurable, the tracking credit formula needs to scale linearly with days.

5. **One-way search tracking costs**: One-way searches don't use the sentinel strategy (they do a full scan every time). The tracking credit tiers assume round-trip sentinel behavior. One-way tracking is more expensive per run. Options: (a) charge more for one-way tracking, (b) add sentinel strategy for one-way. Recommendation: add sentinel strategy for one-way as a follow-up, use the same tracking credit table for now -- the margin absorbs the extra cost for the small number of one-way searches.
