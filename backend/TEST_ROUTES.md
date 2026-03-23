# Test Routes for Price Check Cron

Routes chosen for high price volatility — useful for verifying the sentinel strategy, notification logic, and structured logging.

## How to use

Create saved searches via the API with these parameters. Enable tracking to trigger the cron job. Check server logs for structured price check output.

## Routes

For each route, include origin/destination codes, reason for volatility, and suggested search parameters relative to today (2026-03-23).

### 1. JFK → LHR (New York to London)

**Why it's volatile**: One of the busiest transatlantic routes with heavy competition (10+ carriers). Prices swing $200+ depending on day-of-week and seasonal demand.

**Suggested parameters**:
- Trip type: Roundtrip
- Outbound date: 2026-04-15
- Return date: 2026-04-25 (10 nights)
- Alternative one-way: 2026-04-20

**Expected**: Large absolute price movements ($300–$800 range). Sentinel strategy will catch moderately sized drops. Expect 3–5 carrier options per search.

---

### 2. LAX → NRT (Los Angeles to Tokyo)

**Why it's volatile**: Long-haul with fuel surcharge sensitivity. Prices vary wildly between carriers (budget vs legacy). High base fares mean $500+ swings are common.

**Suggested parameters**:
- Trip type: Roundtrip
- Outbound date: 2026-05-01
- Return date: 2026-05-14 (14 nights)
- Alternative longer window: 2026-05-15 to 2026-06-15

**Expected**: Very high absolute deltas. Sentinel strategy optimized for these expensive routes. Expect 2–4 carrier options; price variance between them can exceed $600.

---

### 3. ORD → CUN (Chicago to Cancun)

**Why it's volatile**: Leisure route with strong seasonal pricing. Last-minute deals and dynamic pricing common. Mix of legacy carriers and LCCs keeps pressure on fares.

**Suggested parameters**:
- Trip type: Roundtrip
- Outbound date: 2026-04-10
- Return date: 2026-04-17 (7 nights)
- Alternative short trip: 2026-04-20 to 2026-04-23 (3 nights)

**Expected**: Moderate price swings ($100–$300). Sentinel tolerance ($2) will trigger full scans more often relative to price. Expect 4–6 carrier/stop combinations.

---

### 4. SFO → CDG (San Francisco to Paris)

**Why it's volatile**: Transatlantic with mix of direct and connecting flights. Price spreads between routing options can exceed $300. Seasonal demand (summer travel) amplifies swings.

**Suggested parameters**:
- Trip type: Roundtrip
- Outbound date: 2026-06-01
- Return date: 2026-06-14 (14 nights)
- Alternative extended trip: 2026-06-01 to 2026-07-15 (45 nights)

**Expected**: Large absolute movements and high variance between direct/connecting. Sentinel strategy will identify major deals. Expect 5–8 different routing options.

---

### 5. MIA → BOG (Miami to Bogota)

**Why it's volatile**: Short international route with frequent price swings from LCC competition (Spirit, Avianca, JetBlue). Lower base fares mean percentage swings are larger.

**Suggested parameters**:
- Trip type: Roundtrip
- Outbound date: 2026-04-05
- Return date: 2026-04-12 (7 nights)
- Alternative quick trip: 2026-04-10 to 2026-04-15 (5 nights)

**Expected**: High percentage volatility but lower absolute deltas ($30–$150). Will test sentinel's handling of competitive routes. Expect 3–5 carrier options with meaningful price gaps.

---

## Expected behavior

- **Sentinel strategy**: Routes 1, 2, 4 (expensive long-haul) will have large absolute sentinel deltas. Routes 3, 5 (cheaper) may trigger full scans more often since $2 tolerance is tighter relative to price.
- **Notifications**: Look for `big_drop` and `moderate_drop` categories on competitive routes (1, 3, 5). `all_time_low` requires 3+ data points across multiple price checks.
- **Timing**: Each group should complete in 5–15 seconds depending on date range width and combo count.
- **Logging**: Check structured JSON output in logs for `price_check` entries with `route`, `sentinel_delta`, `status`, and `notification_category` fields.
