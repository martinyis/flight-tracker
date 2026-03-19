# Airfare - Flight Price Tracker & Search Engine

## Project Summary

**Airfare** is a full-stack mobile application (iOS) that helps travelers find the cheapest dates to fly by searching hundreds of date combinations simultaneously and continuously monitoring prices with intelligent tracking. Unlike Google Flights or Skyscanner which show prices for a single date pair, Airfare generates all possible outbound/return date combinations within a user's flexible travel window and returns the cheapest options ranked by total price.

The app solves a real pain point: when you know you want to fly from Prague to Tokyo sometime in April for 10-14 nights, you'd normally have to manually check dozens of date combinations. Airfare does this in a single search, then optionally tracks prices and sends push notifications when fares drop.

**Target users:** Budget-conscious travelers with flexible dates who want to find the absolute cheapest time to fly a given route.

**Business model:** Credits-based economy with Apple In-App Purchases. Users buy credit packs ($4.99-$59.99) and spend credits on searches and price tracking. New users get 50 free credits (enough for several searches) plus one free search and one free 7-day tracking period to experience the full product before paying.

---

## Core Features

### 1. Multi-Date Flight Search Engine

The flagship feature. Users specify a route (e.g., JFK to LAX), a date window (e.g., April 1-30), and a night range (e.g., 7-14 nights for roundtrip). The backend generates every valid date combination (up to 200), makes concurrent API calls to SerpAPI (Google Flights data), and returns the top 10 cheapest flight options ranked by total price.

**How it works technically:**
- The backend calculates all outbound/return date pairs that fit within the constraints
- Fires up to 5 concurrent requests to SerpAPI (Google Flights scraper) per date pair
- For roundtrip: fetches outbound legs first, then hydrates the top 4 with return-leg details using departure tokens
- Results are deduplicated, sorted by price, and stored in PostgreSQL as JSON columns
- The full pool of 50 raw results is cached in the database so local filtering doesn't require re-calling the API
- A 24-hour deduplication window prevents users from accidentally burning credits on identical searches (returns 409 with the existing search ID)

**Advanced API filters** (passed directly to SerpAPI):
- Maximum stops (nonstop, 1-stop, 2-stop)
- Include/exclude specific airlines or alliances (Star Alliance, SkyTeam, OneWorld)
- Maximum flight duration
- Carry-on bag included

**Local airline filtering** (applied to cached results, zero cost):
- Filter results by airline from the available airlines found in the search
- Recalculates cheapest price after filtering
- No API call needed - instant filtering on cached data

### 2. Intelligent Price Tracking

Users can activate price monitoring on any search. The backend cron job checks prices periodically and sends push notifications when prices drop significantly.

**Sentinel strategy (cost optimization):**
- Instead of re-checking all date combinations (expensive), the system selects 3-4 representative "sentinel" date pairs
- Every check cycle, only the sentinel pairs are queried (3-4 API calls instead of potentially 50+)
- If any sentinel price drops below the cached cheapest by more than $2, a full re-search is triggered
- If sentinels show stable/higher prices, cached results are reused (zero additional API cost)
- This reduces API costs by ~90% while still catching meaningful price changes

**Tracking duration options:** 7 days, 14 days, 30 days, or "until departure" (auto-calculated)

**Auto-deactivation:** The cron job automatically deactivates tracking when:
- The departure date has passed
- The tracking window expires (trackingStartedAt + trackingDays)

**Dynamic scheduling:** `nextCheckAt` is calculated per search to avoid checking flights whose departure is far in the future

### 3. Credits Economy

A usage-based pricing system that replaced an earlier tiered subscription model. Credits provide transparency - users see exactly what each action costs.

**Pricing tiers based on complexity (number of date combinations):**
| Combos | Search Cost | Tracking Base (14d) |
|--------|-------------|---------------------|
| 1-10   | 5 credits   | 50 credits          |
| 11-20  | 10 credits  | 55 credits          |
| 21-50  | 20 credits  | 70 credits          |
| 51-100 | 35 credits  | 95 credits          |
| 101-150| 55 credits  | 125 credits         |
| 151-200| 80 credits  | 160 credits         |

Tracking cost scales linearly by duration: `ceil(base * days / 14)`

**Credit packs (Apple IAP):**
- Starter: 50 credits / $4.99
- Standard: 150 credits / $12.99
- Pro: 400 credits / $29.99
- Power: 1000 credits / $59.99

**Unit economics:** $1 = 10 credits. Each SerpAPI call costs ~$0.025. A 5-credit search ($0.50) may make 5-10 API calls ($0.125-$0.25), yielding ~50% margin.

**Safety mechanisms:**
- Serializable transaction isolation prevents race conditions on concurrent credit operations
- Automatic refund if SerpAPI fails after credits are deducted
- Automatic refund if search returns 5 or fewer results (low-value search)
- First search is free (hasUsedFreeSearch flag)
- First 7-day tracking is free (hasUsedFreeTracking flag)

### 4. Social-Only Authentication

No email/password - users sign in exclusively via Google OAuth or Apple Sign-In.

**Token architecture:**
- **Access tokens:** JWT with 1-hour expiry, contains integer userId
- **Refresh tokens:** 90-day expiry, stored as SHA-256 hashes in the database
- **Token rotation:** Each refresh creates a new token and invalidates the old one
- **Family ID tracking:** All tokens from a single login session share a familyId. If a revoked token is reused (replay attack), the entire family is revoked, forcing re-authentication
- **Serializable isolation:** Token rotation uses PostgreSQL's highest isolation level to prevent race conditions

### 5. Apple In-App Purchases

Full StoreKit 2 integration for credit purchases on iOS.

**Two-phase verification flow:**
1. App initiates purchase via StoreKit -> user completes payment in App Store
2. App sends transaction ID to backend -> backend verifies with Apple's App Store Server API
3. Only after backend confirms does the app finish the StoreKit transaction
4. This prevents duplicate credit grants if the app crashes mid-purchase

**Security:**
- Server-side receipt validation with Apple's signed JWTs
- Bundle ID verification
- Unique constraint on `appleTransactionId` prevents duplicate processing
- Pending transaction recovery on app launch (handles crash scenarios)
- Three environments: Xcode (local testing), Sandbox, Production

### 6. Push Notifications

Price drop alerts via Expo's push notification service.

- Users register their Expo push token during onboarding
- When the cron detects a price drop, it sends a notification with the route and new price
- Tapping the notification deep-links to the specific search detail screen
- Deduplication via `lastNotifiedAt` prevents notification spam
- Notification preferences configurable in settings

### 7. Re-Search with Airline Exclusions

Users can create a new search that excludes specific airlines from a previous search. This is useful when the cheapest results are all from airlines the user doesn't want to fly.

- Creates a new SavedSearch with updated `apiFilters.excludeAirlines`
- Transfers active tracking from the old search to the new one
- Deactivates the old search
- Charges search credits for the new search

### 8. Manual Refresh

Two types of refresh:
- **Free refresh:** Available every 8 hours for searches with active tracking. Calls SerpAPI, updates results and price history. No credit cost.
- **Paid refresh:** Available anytime, can change API filters (e.g., switch from "any stops" to "nonstop only"). Charges search credits.

---

## Technology Stack

### Backend
| Technology | Purpose |
|------------|---------|
| **Node.js + TypeScript** | Runtime and language |
| **Express.js 4.21** | HTTP framework |
| **PostgreSQL** | Primary database |
| **Prisma 7.4** | ORM with `@prisma/adapter-pg` driver adapter |
| **SerpAPI** | Flight data source (Google Flights scraper) |
| **jsonwebtoken** | JWT access tokens |
| **google-auth-library** | Google OAuth token verification |
| **apple-signin-auth** | Apple identity token verification |
| **node-cron** | Background price check scheduling |
| **Pino** | Structured JSON logging with request ID tracking |
| **Zod** | Runtime input validation schemas |
| **express-rate-limit** | Rate limiting (global, auth, SerpAPI) |
| **Helmet** | Security headers |
| **Vitest + Supertest** | Testing framework |

### Frontend (Mobile)
| Technology | Purpose |
|------------|---------|
| **React Native 0.81** | Mobile framework |
| **Expo 54 + Expo Router 6** | Build system and file-based navigation |
| **TypeScript 5.7** | Type safety |
| **React 19** | UI library |
| **React Native Reanimated 4** | 60fps native-thread animations |
| **Axios** | HTTP client with interceptors for auto-refresh |
| **expo-apple-authentication** | Native Apple Sign-In |
| **expo-auth-session** | Google OAuth flow |
| **react-native-iap** | StoreKit 2 in-app purchases |
| **expo-notifications** | Push notification handling |
| **expo-secure-store** | Encrypted token storage |
| **@gorhom/bottom-sheet** | Bottom sheet modals |
| **Lucide React Native** | Icon library |
| **expo-linear-gradient** | Gradient backgrounds |
| **expo-blur** | Glass morphism effects |

### Web (Marketing Site)
| Technology | Purpose |
|------------|---------|
| **Next.js 16** | React framework for marketing site |
| **Tailwind CSS 4** | Utility-first styling |
| **TypeScript** | Type safety |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| **Railway** | Backend hosting (planned) |
| **PostgreSQL (Neon/Railway)** | Managed database (planned) |
| **Expo EAS** | Mobile app builds and TestFlight distribution |
| **Apple App Store** | Distribution (planned) |

---

## Architecture & Design Decisions

### Backend Architecture

```
Routes (Express) -> Controllers -> Services -> Prisma (PostgreSQL)
                                      |
                                      +-> SerpAPI (external)
                                      +-> Apple App Store API (external)
                                      +-> Expo Push API (external)
```

**Service layer decomposition:**
- `authService` - Token generation, rotation, social provider verification
- `creditService` - Balance management, tier calculations, atomic transactions
- `savedSearchService/` - Barrel-exported from 3 submodules:
  - `crud.ts` - Create, read, delete, toggle searches
  - `operations.ts` - Refresh, filter updates, return-leg hydration
  - `tracking.ts` - Tracking activation, re-search with exclusions
- `flight/` - Barrel-exported from submodules:
  - `orchestration.ts` - Search coordination, sentinel checks, combo building
  - `serpClient.ts` - SerpAPI HTTP calls, response parsing, cost tracking
- `notificationService` - Expo push notification delivery
- `appleIapService` - Apple receipt validation

**Key patterns:**
- **Barrel exports** for service modules (clean imports)
- **Async handler wrapper** to catch errors and forward to error middleware
- **Custom AppError class** with HTTP status codes and optional data payloads
- **Typed JSON columns** - Prisma `Json` fields cast through TypeScript interfaces via `TypedSavedSearch`
- **Request ID tracking** - UUID per request, bound to Pino logger for traceability
- **Graceful shutdown** - SIGTERM/SIGINT handlers close HTTP server, disconnect Prisma, 10s force-exit timeout

### Frontend Architecture

**Provider-based state management** (no Redux/Zustand - app is ~8 screens, providers are sufficient):

```
NetworkProvider        - Connectivity detection
  HapticsProvider      - Haptic feedback control
    AuthProvider       - JWT tokens, user state, auto-refresh
      CreditsProvider  - Balance, transactions
        PendingSearchProvider - Long-running search coordination
          ToastProvider - Notification toasts
            BottomSheetModalProvider - Sheet framework
              ErrorBoundary - Crash handling
                <Screens>
```

**Key frontend patterns:**
- **Token auto-refresh interceptor** - Axios response interceptor catches 401, refreshes token, queues and retries failed requests
- **Fast vs. slow error distinction** - Errors that come back in <2s (402 insufficient credits, 409 duplicate, 429 rate limit) are shown inline in the form. Errors that come back after the user has navigated away show as a toast/banner on the home screen
- **PendingSearchProvider** - Coordinates the 30-60 second search operation across screen transitions (user can navigate away while search runs in background)
- **Haptics on every interaction** - Following Apple HIG, nearly every tap triggers haptic feedback for perceived responsiveness
- **Native-thread animations** - All animations use `useNativeDriver: true` via Reanimated for guaranteed 60fps

### Design Philosophy

The app follows a custom design system documented in a 54KB design specification:
- **Philosophy:** "You are already in the sky" - abstract luminosity and depth rather than literal airplane imagery
- **Personality:** Knowledgeable friend who happens to understand flight pricing
- **Visual language:** Mesh gradient backgrounds, subtle glass morphism, content-first layouts (no heavy card borders)
- **Typography:** Outfit font family across 9 weights
- **Color palette:** Sky blue primary (#2F9CF4), warm gold accent (#F59E0B) for deals, slate neutral scale
- **Anti-patterns:** No skeleton loaders (custom pulsing dots instead), no cartoon illustrations, no generic spinners

---

## Database Design

### Models

**User** - Core identity + credit balance
- Social auth IDs (googleId, appleId) for OAuth linking
- `creditBalance` (integer) - denormalized balance for fast reads
- `hasUsedFreeSearch` / `hasUsedFreeTracking` - one-time free usage flags
- `pushToken` - Expo push notification token

**SavedSearch** - Flight search with cached results and tracking config
- Route info: origin, destination, dateFrom, dateTo, tripType, minNights, maxNights
- Cached results: `latestResults` (top 10 display), `rawLegs` (pool of 50 for local filtering)
- Tracking config: `trackingActive`, `trackingDays`, `trackingStartedAt`, `nextCheckAt`, `sentinelPairs`
- Filters: `apiFilters` (SerpAPI params), `filters` (local airline filter)
- Price history: `priceHistory` (array of {date, cheapestPrice} entries), `cheapestPrice` (current lowest)
- Metadata: `availableAirlines`, `airlineLogos`, `comboCount`, `searchCredits`, `trackingCredits`

**CreditTransaction** - Immutable ledger for all credit changes
- Types: signup_bonus, purchase, search, search_refresh, tracking, refund
- `appleTransactionId` (unique) - deduplicates Apple IAP
- Links to User and optionally to SavedSearch

**RefreshToken** - Token rotation chain with replay detection
- `tokenHash` - SHA-256 of raw token (never store plaintext)
- `familyId` - UUID grouping all tokens from one login session
- `replacedById` - links to next token in rotation chain
- `revokedAt` - null means valid, set on revocation

### Key Indexes
- `(active, dateTo)` - cron: find searches to auto-deactivate
- `(active, nextCheckAt)` - cron: find searches due for price check
- `(userId, createdAt)` - user's search list ordered by creation
- `(tokenHash)` - fast refresh token lookup
- `(familyId)` - revoke entire token family on replay detection

---

## Development Journey

The project was built over approximately 3 weeks (Feb 27 - Mar 18, 2026), progressing through several distinct phases:

### Phase 1: Foundation (Feb 27)
Started with basic backend and frontend scaffolding. Express.js backend with initial flight search capability, React Native frontend with Expo Router.

### Phase 2: Database Migration (Mar 4)
**Major pivot:** Migrated from MongoDB/Mongoose to PostgreSQL/Prisma 7.x. This was driven by the need for relational data modeling (users -> searches -> transactions), ACID transactions for credit operations, and Prisma's superior TypeScript integration. Also implemented authentication and saved searches at this stage.

### Phase 3: OAuth & iOS (Mar 6)
Integrated Apple Sign-In and Google OAuth. Added iOS-specific support. Implemented cost optimization to reduce SerpAPI usage (early version of what became the sentinel strategy).

### Phase 4: Credits System & API Filters (Mar 11)
**Major feature:** Replaced a tiered dollar-based pricing model with a credits economy. Removed email/password auth entirely (social-only). Added API-level filters that pass through to SerpAPI (stops, airlines, duration, bags). Major frontend redesign.

### Phase 5: Push Notifications & Branding (Mar 14)
Added push notification infrastructure via Expo. First app rename from the working title to "SkyLens." Added Android support. UI polish pass.

### Phase 6: Security Hardening (Mar 16)
Implemented refresh token rotation with family-based replay detection. Added rate limiting (global, per-auth-endpoint, per-SerpAPI-endpoint). Integrated Pino structured logging with request ID tracking. Auth flow improvements.

### Phase 7: Apple IAP & Testing (Mar 17)
Implemented Apple In-App Purchases with server-side receipt validation. Renamed app to "Airfare." Added integration test suite with Vitest + Supertest. Various UX improvements.

### Phase 8: Production Prep (Mar 17)
Production environment hardening. Environment variable validation. UTC timezone fixes for cron. Simplified splash screen. Legal documents (privacy policy, ToS, EULA, acceptable use, data deletion).

### Phase 9: Web & Documentation (Mar 17)
Added Next.js 16 marketing/landing site with Tailwind CSS. Legal pages. Railway deployment guide. Comprehensive deployment documentation.

### Phase 10: Current State (Mar 18)
Pre-launch phase. All core features implemented. Working on final TestFlight deployment, App Store submission prep, and production API configuration.

---

## Key Technical Challenges & Solutions

### 1. Efficient Price Monitoring at Scale
**Challenge:** Checking all date combinations for every tracked search would be prohibitively expensive (hundreds of API calls per check cycle).
**Solution:** Sentinel strategy - select 3-4 representative date pairs per search, only check those. Full re-search only triggers if sentinel prices drop significantly (>$2 tolerance). Reduces API costs by ~90%.

### 2. Race Conditions in Credit Operations
**Challenge:** Concurrent requests could double-spend credits or grant duplicate IAP credits.
**Solution:** PostgreSQL serializable transaction isolation for all credit mutations. Unique constraint on Apple transaction IDs. Fast-path dedup check before expensive transaction.

### 3. Long-Running Search Operations
**Challenge:** Flight searches take 30-60 seconds (multiple concurrent SerpAPI calls). Users shouldn't be blocked on one screen.
**Solution:** PendingSearchProvider manages search state across screen transitions. Users navigate to home while search runs in background. Fast errors (402, 409, 429) are returned immediately to the form; slow errors show as banners on home.

### 4. Token Security
**Challenge:** Refresh tokens are long-lived (90 days) and must be protected against theft and replay.
**Solution:** Token rotation (each use creates a new token), family ID tracking (reuse of old token revokes entire family), SHA-256 hashing (tokens never stored in plaintext), serializable isolation on rotation.

### 5. SerpAPI Response Complexity
**Challenge:** Round-trip flights require two API calls per date pair (outbound search + return leg fetch using departure_token). Results must be merged into unified FlightCombo objects.
**Solution:** Two-phase hydration - first fetch all outbound options with prices, then selectively hydrate top results with return-leg details. Lazy hydration available for individual options on-demand.

### 6. Prisma 7.x Migration
**Challenge:** Prisma 7 introduced breaking changes (new generator name, driver adapter pattern, config file requirements, removed `url` from schema).
**Solution:** Created `prisma.config.ts` for database URL configuration, switched to `@prisma/adapter-pg` driver adapter pattern, handled build-time URL fallback for Prisma generation.

### 7. Apple IAP Crash Recovery
**Challenge:** If the app crashes between StoreKit purchase completion and backend verification, the user pays but doesn't receive credits.
**Solution:** On app launch, check for pending StoreKit transactions via `getPendingTransactionsIOS()`. Verify and finish any unprocessed transactions. Backend dedup via unique `appleTransactionId` ensures idempotency.

---

## API Design

### Endpoints Summary

**Auth:** 7 endpoints - Google/Apple login, token refresh, logout, profile CRUD, push token registration, account deletion

**Search:** 12 endpoints - CRUD, toggle active, local filter update, free refresh, paid refresh, booking URL, return-leg hydration (batch + single), tracking activation, re-search with airline exclusions

**Credits:** 4 endpoints - balance + history, cost calculator, pack listing, purchase verification

### Error Handling
- Custom `AppError` class with HTTP status codes and structured data payloads
- Prisma P2025 (record not found) automatically mapped to 404
- Sensitive fields (tokens, passwords) redacted from error logs
- Rate limit responses include `Retry-After` header

### Rate Limiting
- **Global:** 300 requests per 15 minutes per IP
- **Auth endpoints:** 30 per 15 minutes per IP
- **SerpAPI endpoints:** 10 per minute per userId (prevents API quota exhaustion)

---

## Security Measures

1. **Authentication:** Social-only (no password storage), JWT with short expiry, refresh token rotation with replay detection
2. **Database:** Serializable isolation for financial operations, cascading deletes on account removal
3. **API:** Rate limiting at multiple levels, input validation via Zod schemas, Helmet security headers
4. **Tokens:** SHA-256 hashed storage, family-based revocation, automatic cleanup of expired tokens
5. **IAP:** Server-side Apple receipt validation, transaction ID dedup, environment-aware verification
6. **Logging:** Sensitive fields redacted, structured logs with request IDs, separate log levels per environment
7. **Input validation:** IATA code format (3 uppercase letters), date format, numeric ID parsing guards, combo count cap (200)

---

## Project Metrics

- **Codebase:** ~15,000+ lines of TypeScript across backend, frontend, and web
- **Database migrations:** 17 sequential migrations tracking schema evolution
- **API endpoints:** 23 REST endpoints
- **Database models:** 4 (User, SavedSearch, CreditTransaction, RefreshToken)
- **Frontend screens:** 8 (welcome, onboarding, home, add-search, search detail, credits, settings, activity preferences)
- **Providers:** 6 (Auth, Credits, PendingSearch, Haptics, Toast, Network)
- **Custom hooks:** 3 (useGoogleAuth, useAppleAuth, useAppleIAP)
- **Development time:** ~3 weeks (solo developer)
- **Git commits:** 17 meaningful feature commits

---

## What Makes This Project Notable

1. **Full product thinking** - Not just code, but a complete product with pricing strategy, onboarding flow, legal docs, and marketing site
2. **Real-world API integration** - Handling the complexity of flight data (multiple legs, departure tokens, return-leg hydration, airline logos)
3. **Financial system** - Credits economy with atomic transactions, refund logic, and real Apple IAP integration
4. **Cost optimization** - Sentinel strategy demonstrates ability to design algorithms that balance accuracy vs. API cost
5. **Security depth** - Token rotation with replay detection, serializable isolation, rate limiting - production-grade security
6. **Mobile-native quality** - 60fps animations, haptic feedback, push notifications, offline detection, StoreKit integration
7. **Solo full-stack execution** - Backend, mobile app, web site, database design, deployment config, legal docs - all built by one person in 3 weeks
8. **Iterative architecture** - Database migration (Mongo to Postgres), pricing model pivot (tiers to credits), multiple app renames - demonstrates ability to refactor and evolve
