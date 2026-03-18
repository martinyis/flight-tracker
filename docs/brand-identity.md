# AirFare - Complete Brand, UI & Experience Blueprint

> This document captures every detail of AirFare's brand identity, visual design, screen-by-screen flows, animations, copy, and interaction patterns. It is intended for a product/UX advisor to evaluate market readiness and engagement potential.

---

## 1. Brand Identity

### Name & Tagline
- **App Name**: AirFare
- **Tagline**: "We check every date so you don't have to."
- **Core Promise**: Automated exhaustive flight price scanning across every date combination in a flexible range, so the user never manually checks prices again.

### Brand Narrative
AirFare positions itself as an intelligent, always-on flight price scanner. The brand communicates a data-driven, tech-forward identity through visual metaphors of scanning, radar sweeps, and dot-grid data visualizations. The aesthetic evokes sky, light, and air travel — luminous blues, soft gradients, and floating elements.

### Logo
- A plane icon with an arc/sweep design (PNG asset)
- Displayed at ~110px on splash/welcome screens
- Surrounded by animated glow rings (pulsing halo effect) on the welcome screen
- Rounded corners (26px radius) with subtle border and blue drop shadow

### Brand Personality
- **Trustworthy**: Blue-dominant palette signals reliability
- **Smart/Automated**: Scanning animations and data grid visuals communicate "working for you"
- **Premium but accessible**: Frosted glass UI, smooth animations, generous spacing — feels high-end without being intimidating
- **Calm confidence**: Light, airy backgrounds; no aggressive marketing language; understated copy

### Voice & Tone
- **Concise**: Short, clear sentences. No fluff.
- **Conversational**: Time-of-day greetings ("Good morning"), casual phrasing
- **Reassuring**: "We'll let you know when it's ready", "We check every date so you don't have to"
- **Data-focused**: Headlines surface price insights ("JFK to LAX dropped $12", "Cheapest: $142")
- **No urgency/scarcity tactics**: No "Act now!", no countdown timers, no "Only 2 seats left!" — the app trusts the user

---

## 2. Visual Design System

### Color Palette

#### Primary
| Token | Hex | Usage |
|-------|-----|-------|
| Primary | `#2F9CF4` | Main accent, buttons, active tab icons, links |
| Primary Dark | `#1A7ED4` | Pressed/active button states |
| Primary 100 | `#E0F2FE` | Light tinted backgrounds |
| Primary 200 | `#BAE1FC` | Badge borders, light accents |
| Primary 300 | `#8FD0FA` | Gradient layers, subtle fills |

#### Neutrals (Slate-based)
| Token | Hex | Usage |
|-------|-----|-------|
| Neutral 900 | `#0F172A` | Primary text, headings |
| Neutral 700 | `#334155` | Secondary text |
| Neutral 500 | `#64748B` | Body text, muted labels |
| Neutral 400 | `#94A3B8` | Placeholders, inactive icons, meta text |
| Neutral 300 | `#CBD5E1` | Dividers, borders, decorative lines |
| Neutral 200 | `#E2E8F0` | Light borders |
| Neutral 100 | `#F1F5F9` | Very light backgrounds |

#### Semantic
| Token | Hex | Usage |
|-------|-----|-------|
| Success | `#22C55E` | Price drops, positive changes, checkmarks |
| Success Dark | `#16A34A` | Darker green variant |
| Success BG | `rgba(34,197,94,0.08)` | Green-tinted pill/badge backgrounds |
| Error | `#EF4444` | Price increases, errors, destructive actions |
| Error Dark | `#DC2626` | Darker red variant |
| Error BG | `rgba(239,68,68,0.08)` | Red-tinted pill/badge backgrounds |
| Warning/Amber | `#F59E0B` | Credits coin icon, currency accents |
| Warning Light | `#FEF3C7` | Amber-tinted backgrounds |

#### Backgrounds
| Token | Value | Usage |
|-------|-------|-------|
| App Background | `#DCEEFB` | Base screen color (warm sky blue) |
| Auth Background | `#0A1628` | Welcome/splash screen (deep navy) |
| White | `#FFFFFF` | Cards, inputs, modal surfaces |

#### Mesh Gradient System (applied to all main screens)
The app uses a 4-layer gradient mesh that creates a soft, luminous sky-like feeling:
1. **Layer 1** (diagonal): `#DCEEFB` to `#EBF3FE` to `#F4F8FF` to `#FAFCFF`
2. **Layer 2** (top-down): `rgba(143,208,250,0.12)` to transparent — subtle blue wash from top
3. **Layer 3** (bottom-right): transparent to `rgba(165,180,252,0.06)` — warm indigo touch
4. **Layer 4** (right edge): transparent to `rgba(103,232,249,0.05)` to transparent — cyan edge accent

### Typography

#### Font Family
- **Outfit** (Google Font) — used exclusively throughout
- Modern geometric sans-serif with excellent weight range
- No italic variants; the app relies entirely on weight for hierarchy

#### Weight Scale
| Weight | Name | Primary Usage |
|--------|------|---------------|
| 100 | Thin | Not actively used |
| 200 | ExtraLight | Not actively used |
| 300 | Light | Not actively used |
| 400 | Regular | Body text, descriptions, meta labels |
| 500 | Medium | Settings labels, section headers, insights |
| 600 | SemiBold | Badge text, field labels, transaction types |
| 700 | Bold | Headings, button labels, names, section titles |
| 800 | ExtraBold | Prices, airport codes, balance numbers, large titles |
| 900 | Black | Not actively used |

#### Size Scale (in use)
| Size | Usage |
|------|-------|
| 56px | Credit balance hero number |
| 30px | Screen titles ("Credits", "Profile", greeting) |
| 28px | Brand name, onboarding title |
| 24px | Flight prices on search rows |
| 22px | Display name, tagline |
| 21px | Airport route codes (JFK → LAX) |
| 20px | Bottom sheet titles |
| 18px | Section titles, insight values |
| 17px | Mini result card route text |
| 16px | Buttons, settings labels, input text |
| 15px | Settings values, insights |
| 14px | Onboarding subtitle, transaction types |
| 13px | Meta text, date ranges, pack info |
| 12px | Status labels, timestamps, badge text |
| 11px | Section labels, unit prices |
| 10px | "BEST VALUE" pill text |

#### Letter Spacing
The app uses negative letter spacing on larger text for a tighter, more modern feel:
- -0.8 on large prices (24px)
- -0.6 on screen titles (30px), route codes (21px), onboarding titles
- -0.4 on display names (22px), insight values
- -0.3 on brand name
- -0.2 on section titles, tagline
- -0.1 on transaction types
- Positive 0.2 on field labels, button text (for readability at smaller sizes)
- Positive 0.8 on uppercase labels ("CREDITS AVAILABLE", section headers)

### Spacing System
| Token | Size | Usage |
|-------|------|-------|
| XL | 32px | Section spacing, bottom sheet padding |
| L | 24px | Screen horizontal padding, section gaps |
| M | 20px | Card inner padding, component spacing |
| S | 16px | Component spacing, banner padding |
| XS | 12px | Icon spacing, badge padding |
| XXS | 8px | Button hit slop expansion |
| Micro | 4-6px | Dot sizes, thin dividers |

### Corner Radius
| Element | Radius |
|---------|--------|
| Bottom sheet | 24px |
| Cards | 12-16px |
| Buttons | 10-14px |
| Nav bar pill | ~28px (fully rounded) |
| Icon containers | 10-12px |
| Avatars | 50% (full circle) |
| App logo | 26px |

### Dividers
- Standard: `rgba(148,163,184,0.15)` — very subtle
- Strong: `rgba(148,163,184,0.2)` — slightly more visible
- Hairline thickness (StyleSheet.hairlineWidth)

### Shadows
- Nav bar: `rgba(0,0,0,0.08)` with 12px blur, 4px offset
- Add button: `rgba(47,156,244,0.3)` glow
- Logo: Blue glow shadow, 30px radius, 0.5 opacity
- Cards: Minimal elevation, subtle gray shadow

---

## 3. Screen-by-Screen Breakdown

### Screen 1: Welcome (Authentication)
**File**: `app/welcome.tsx`
**Background**: Deep navy (`#0A1628`) — the only dark screen in the app

#### Visual Layout (top to bottom)
1. **Brand Section** (top ~25%)
   - App name "AirFare" in ExtraBold white
   - Tagline "We check every date so you don't have to." in Regular white at 60% opacity
   - Fades in with upward slide (400ms delay, 500ms duration)

2. **Data Visualization Grid** (middle ~40%)
   - A 7-column × 6-row grid of animated dots (FlightPriceWave component)
   - Dots represent flight date combinations being scanned
   - A horizontal scan bar sweeps left-to-right (3.5 seconds per sweep) with a multi-layer glow effect
   - As the scan bar passes over dots, some illuminate green (cheap flight found) or red (expensive)
   - Radar ping rings expand outward from highlighted dots
   - Edge columns (first and last) have reduced opacity (0.3) to suggest the grid extends beyond view
   - Random ambient flicker on dots every 2-4 seconds

3. **Gradient Fade Overlay** (covers bottom ~58% of grid)
   - Transparent at top fading to `#0A1628` at bottom
   - Creates a dissolve effect where the grid fades into the dark background

4. **Mini Result Card** (positioned within the fade zone)
   - Dark card (`#111D30`) with blue border glow
   - Shows example: "JFK → LAX" / "Mar 7 – Mar 12" / "5 nights · Direct"
   - **Price countdown animation**: $187 → $142 → $94 (three steps, 500ms intervals)
   - Green success dot + "lowest found" label
   - Slides up + fades in (1500ms delay, 600ms duration)

5. **Social Auth Buttons** (bottom, pinned)
   - **Continue with Apple** (iOS only): Frosted white button `rgba(255,255,255,0.12)`, Apple logo
   - **Continue with Google**: Even more subtle `rgba(255,255,255,0.08)`, Google logo
   - Loading spinner replaces text during authentication
   - Error message appears above buttons in red-tinted box if auth fails
   - Fade in + slide up animation (400ms delay, 500ms)

#### The Story Being Told
The welcome screen tells a visual story: "We scan hundreds of date combinations (grid), find the cheapest price (countdown from $187 to $94), and surface the best deal for you (result card)." The user watches this narrative play out before signing in.

#### User Flows from This Screen
- Tap "Continue with Apple" → Apple Sign-In flow → redirect to Home
- Tap "Continue with Google" → Google Sign-In flow → redirect to Home
- Auth failure → error message displayed above buttons

---

### Screen 2: Home (Search List / Dashboard)
**File**: `app/index.tsx`
**Background**: Mesh gradient (luminous sky blue)

#### Visual Layout — With Existing Searches

1. **Header Section**
   - **Greeting**: "Good morning/afternoon/evening" (Bold, 30px, dark)
   - **Smart headline**: Dynamic insight pulled from user's search data
     - Examples: "JFK to LAX dropped $12" / "Cheapest: JFK to LAX at $142" / "Watching 3 routes" / "Your searches are paused"
     - Colored primary blue, Medium weight, 15px
   - Fades in with 100ms delay, 600ms duration

2. **Pending Search Banner** (conditional, appears when search is in-progress)
   - **Searching state**: Blue-tinted background, pulsing dot animation (1600ms loop), "Searching JFK → LAX..." / "We'll let you know when it's ready"
   - **Completed state**: Green-tinted background, checkmark icon, "Search complete!" / "Tap to view results"
   - **Error state**: Red-tinted background, X dismiss button, error message
   - Slides in from top (-20px offset, 400ms)

3. **Search Rows** (scrollable list via FlatList)
   Each saved search is a row containing:
   - **Route**: Origin → Destination airport codes (ExtraBold, 21px)
   - **Sparkline chart**: Tiny 64×28px SVG line chart showing price history
     - Green line if price trending down
     - Red line if trending up
     - Gray if stable or insufficient data
   - **Price**: Current best price (ExtraBold, 24px) or "--" if pending
   - **Trend Pill** (conditional):
     - "↓$12 since tracking" on green background
     - "↑$45 since tracking" on red background
   - **Meta row**: Date range ("Mar 7 – Mar 12") + duration ("5n") + result count ("3 flights") + status
   - **Status text**: "Paused" / "Checked 2h ago" / "Expires today" / "Expires tomorrow" / "14d left"
   - Each row has staggered entrance animation (60ms base + 60ms × index, 450ms duration)
   - Subtle press highlight (opacity 0.04 blue tint)
   - Hairline divider between rows

4. **Insights Section** (below search list)
   - Up to 3 insight rows (fade-in with 300ms delay):
     - **Best Deal**: Green label, cheapest search name + price
     - **Next Trip**: Blue label, days until nearest departure
     - **Biggest Move**: Green "Price drop" or red "Price spike" label + dollar amount
   - Dividers between insight rows

5. **Bottom Navigation Bar** (always visible)
   - Frosted glass pill (BlurView, `rgba(255,255,255,0.75)`)
   - 4 items: Home (filled when active) | Add Search (blue circle with + icon) | Credits | Settings
   - Active tab: primary blue icon; Inactive: neutral gray
   - Add button has blue glow shadow, scales to 0.92 on press
   - 56px height, positioned absolute at bottom with safe area padding

#### Visual Layout — Empty State (No Searches Yet, Onboarding)

1. **Header** (same greeting + generic headline like "Watching 0 routes")

2. **Onboarding Content**
   - **Title**: "You pick the dates. We find the deal." (ExtraBold, 24px)
   - **Subtitle**: "Give us a flexible range and we'll search every date combination to find the absolute cheapest flight." (Regular, 14px)

   - **"Without AirFare" section**:
     - 4 example date rows: "Mar 10? ... $412", "Mar 13? ... $387", "Mar 18? ... $241", "Mar 22? ... $356"
     - Dotted line separators between rows
     - Faded italic text: "...and 200 more combinations to check"

   - **Arrow connector**: Visual stem + point connecting "without" to "with" sections

   - **"With AirFare" section** (reveals 550ms later for dramatic effect):
     - Blue dot: "200+ combos searched in seconds"
     - Green dot: "Cheapest found: Mar 18 — $241"
     - Amber dot: "Price drops? We'll notify you instantly"

   - **CTA Button**: "Find my cheapest flight" + chevron icon
     - Primary blue, shadow effect, scales to 0.97 on press
     - Links to Search Wizard (add-search screen)

#### User Flows from This Screen
- Tap a search row → Navigate to Search Details (search/[id])
- Tap "Find my cheapest flight" or blue + button → Navigate to Search Wizard (add-search)
- Tap Credits tab → Navigate to Credits screen
- Tap Settings tab → Navigate to Settings screen
- Tap pending search banner (completed state) → Navigate to new search results
- Pull to refresh → Reload search data
- Tap pending search banner X (error state) → Dismiss error

---

### Screen 3: Search Wizard (Add Search)
**File**: `app/add-search.tsx`
**Background**: Mesh gradient
**Navigation**: Stack push with default iOS slide-in transition + swipe-back gesture

#### Visual Layout

1. **Header Bar**
   - Back button (frosted glass, 38×38px, chevron icon)
   - Title: "Search Wizard" (centered)

2. **Form Body** (scrollable, expanding sections with animations)

   **Section 1 — "Where are you going?"**
   - **Trip Type Toggle**: "Roundtrip" / "One-way" segmented control
     - Animated height/opacity transition when switching (300ms)
   - **Origin Airport Field**: Tap to open AirportSearchModal
     - Shows selected airport code or "Select origin" placeholder
   - **Destination Airport Field**: Same pattern
   - Section shows checkmark when both airports selected

   **Section 2 — "When?"**
   - **Departure Date**: Tap opens native DateTimePicker
     - Displays as "Mar 7, 2026"
     - Defaults to today + 7 days
   - **Return Date** (roundtrip only):
     - Defaults to today + 21 days
   - **Min/Max Nights** (roundtrip only):
     - Default range: 1-14 nights
     - Up/down spinner buttons to adjust
     - Live combo count recalculation on every change

   **Section 3 — "Preferences"** (collapsed by default)
   - Toggle: "More filter options" (expandable)
   - **Stops**: "Any" / "Nonstop" / "1 stop" selector
   - **Airlines**: Include/Exclude mode toggle, comma-separated airline code input
   - **Max Duration**: Dropdown with presets — "Any", "4h", "6h", "8h", "10h", "12h", "16h", "24h"
   - **Bags**: "Carry-on included" checkbox/toggle
   - Section expand/collapse animates via maxHeight interpolation (0→600, 300ms) + opacity

3. **Cost Display** (near bottom, always visible when form has data)
   - "Searching 156 combos"
   - "Search: 10 credits" + "Tracking (14d): 50 credits"
   - Red warning if >200 combos: "Too many combinations (>200)"

4. **Search Button** (sticky bottom)
   - Primary blue, full width
   - Disabled (grayed out) if origin or destination missing
   - Shows loading spinner during search API call
   - Haptic feedback on press

5. **Searching Overlay** (appears during search)
   - Full-screen semi-transparent dark overlay
   - Centered pulsing dot animation
   - Text: "Searching JFK → LAX..."
   - Cannot be dismissed; auto-closes on completion

#### User Flows from This Screen
- Fill form → Tap "Search" → Searching overlay → Redirect to Home with pending banner
- Tap back button → Return to Home
- Swipe right → Return to Home (iOS gesture)
- Tap airport field → AirportSearchModal opens → Search/select airport → Modal closes
- Toggle "More filter options" → Section expands with animation
- Adjust nights → Combo count recalculates live
- >200 combos → Warning shown, search button disabled

---

### Screen 4: Search Details (Flight Results)
**File**: `app/search/[id].tsx`
**Background**: Mesh gradient (lighter variant)
**Navigation**: Stack push with slide-in transition + swipe-back

#### Visual Layout

1. **Header**
   - Frosted glass back button
   - Route hero: "JFK ↔ LAX" (large, bold)
   - Date range badge beneath route

2. **Applied Filters** (horizontal scrollable chips)
   - Shows active API filters (stops, airlines, duration, bags)
   - Visual indication that changing filters requires a new search

3. **Flight Results List** (scrollable)
   Each result displays via RoundTripStrip or OneWayStrip component:
   - **Per flight leg**:
     - Airline logo (with text fallback if logo unavailable)
     - Departure time → Arrival time
     - Duration (e.g., "5h 30m")
     - Stops indicator ("Nonstop" or "1 stop via DFW")
   - **For roundtrip**: Outbound + return legs stacked
   - **Total price** (ExtraBold, prominent)
   - **Nights** (roundtrip): "5 nights"
   - **"Book on Google Flights"** button → Opens external link

4. **Loading State**
   - 3 pulsing dots animation
   - "Loading flights..." text

5. **Empty State**
   - "No flights found for your search"

6. **Error State**
   - Error message + retry button

#### User Flows from This Screen
- Scroll through flight results
- Tap "Book on Google Flights" → Opens external browser/in-app browser to Google Flights
- Tap back button → Return to Home
- Swipe right → Return to Home
- Pull to refresh → Reload flight data

---

### Screen 5: Credits
**File**: `app/credits.tsx`
**Background**: Mesh gradient
**Navigation**: Tab screen (fade transition, no swipe-back)

#### Visual Layout

1. **Header**: "Credits" (Bold, 30px)

2. **Balance Card**
   - Large hero number (ExtraBold, 56px): e.g., "200"
     - Animates from 0 to final value (600ms, easing)
   - Label beneath: "CREDITS AVAILABLE" (SemiBold, 12px, letter-spacing 0.8)
   - Entrance fade-in (100ms delay, 500ms)

3. **Top Up Section**
   - Section title: "Top up" (Bold, 18px)
   - **App Store status** (conditional, iOS):
     - "Connecting to App Store..." (while loading)
     - "App Store unavailable — prices may not be current" (if connection lost)
   - **4 Credit Packs**:
     | Pack | Credits | Price | Note |
     |------|---------|-------|------|
     | Starter | 50 | $4.99 | |
     | Standard | 150 | $12.99 | "BEST VALUE" pill |
     | Pro | 400 | $29.99 | |
     | Power | 1000 | $59.99 | |
   - Each pack row shows:
     - Pack name (Bold, 16px)
     - Credits count + per-credit price ("50 credits · $0.10/credit")
     - "Buy" button on right (primary blue, shows price)
     - Loading: spinner + "Verifying..." during in-app purchase
     - Disabled state (opacity 0.6) while another pack is purchasing
   - Hairline dividers between packs

4. **Activity Section**
   - Title: "Recent activity" (Bold, 18px)
   - Transaction list (newest first):
     - **Type** (SemiBold, 14px): "Welcome bonus", "Credits purchased", "Search", "Tracking", "Refund"
     - **Note** (Regular, 13px, muted): Optional detail
     - **Amount** (Bold, 16px): Green "+50" for credits gained, Red "-10" for credits spent
   - **Empty state**: "No activity yet. Your transaction history will show here."
   - Hairline dividers between transactions

5. **Bottom Navigation Bar**

#### User Flows from This Screen
- Tap "Buy" on a credit pack → In-app purchase flow → Balance updates + success toast
- Scroll transaction history
- Pull to refresh → Reload balance + transactions
- Tap Home tab → Navigate to Home
- Tap Settings tab → Navigate to Settings
- Tap Add button → Navigate to Search Wizard

---

### Screen 6: Settings (Profile)
**File**: `app/settings.tsx`
**Background**: Mesh gradient
**Navigation**: Tab screen (fade transition, no swipe-back)

#### Visual Layout

1. **Header**: "Profile" (Bold, 30px)

2. **Identity Section** (animated entrance: fade-in + slide-up, 80ms delay, 500ms)
   - **Avatar**: 72×72px circle, primary blue background, white initials
   - **Display Name** (Bold, 22px) or empty if not set
   - **Email** (Regular, 15px) — hidden if Apple private relay
   - **Member Since**: "Member since January 2026" (Regular, 14px, neutral gray)

3. **Quick Stats Row** (bordered container)
   - Three columns with vertical dividers:
     - Credit balance (number + "CREDITS")
     - Active searches (number + "ACTIVE")
     - Total searches (number + "TOTAL")

4. **Settings Sections** (labeled groups with rows)

   **ACCOUNT**
   - Name → Tap opens Edit Name bottom sheet
   - Email (display only)
   - Signed in with: "Google" or "Apple"
   - Member since (display only)

   **ACTIVITY**
   - Active searches: "X tracking"
   - Credits balance: "X credits"

   **PREFERENCES**
   - Haptic Feedback: Toggle switch — "Vibration on interactions"
   - Notifications: Toggle switch — "Price drop alerts"

   **SUPPORT & LEGAL**
   - Contact Support → Opens mailto
   - Privacy Policy → Alert: "Coming Soon"
   - Terms of Service → Alert: "Coming Soon"

5. **Sign Out Button**
   - Red outline style, LogOut icon
   - "Sign out" label
   - Confirmation before action

6. **Danger Zone**
   - "DANGER ZONE" label (red)
   - **Delete Account** row: Trash icon + "Delete account" + "Permanently remove your account and all data"
   - Confirmation alert: "Delete your account? This will permanently delete your account, all saved searches, and credit history. This cannot be undone."

7. **Edit Name Bottom Sheet** (modal)
   - White background, rounded top corners (24px)
   - "Edit name" title + close (X) button
   - First name text input
   - Last name text input
   - "Save" button (primary blue, disabled if no changes, "Saving..." during request)
   - Interactive keyboard avoidance

8. **Bottom Navigation Bar**

#### User Flows from This Screen
- Tap Name → Edit Name bottom sheet opens → Edit → Save → Sheet closes
- Toggle Haptic Feedback → Immediately enables/disables vibration globally
- Toggle Notifications → Permission request if not yet granted → Enables/disables alerts
- Tap Contact Support → Opens email client
- Tap Privacy Policy / ToS → "Coming Soon" alert
- Tap Sign Out → Confirmation → Logged out → Redirect to Welcome
- Tap Delete Account → Confirmation alert → Account deleted → Redirect to Welcome
- Tap Home tab → Navigate to Home
- Tap Credits tab → Navigate to Credits

---

## 4. Animation & Motion Design

### Philosophy
Every state transition in AirFare is animated. Nothing appears or disappears instantly. The motion language communicates that the app is alive, actively working, and polished.

### Animation Inventory

#### Welcome Screen Animations
| Animation | Duration | Delay | Easing | Description |
|-----------|----------|-------|--------|-------------|
| Tagline entrance | 500ms | 400ms | out(ease) | Fade-in + slide-up from 16px |
| Dot grid flicker | 2-4s random | — | — | Random opacity changes on individual dots |
| Scan bar sweep | 3500ms | — | linear | Horizontal beam sweeps full grid width |
| Scan bar pause | 1000ms | after sweep | — | Pauses before next sweep |
| Dot illumination | 300ms | — | — | Scale-up + opacity change when scan bar passes |
| Dot highlight green | 300ms | — | ease | Dot turns green, grows to 5px |
| Dot highlight red | 300ms | — | ease | Dot turns red, grows to 3px |
| Radar ping | 1500ms loop | staggered (750ms offset for 2nd ring) | ease | Expanding rings around highlighted dots |
| Mini result card | 600ms | 1500ms | out(ease) | Fade-in + slide-up |
| Price countdown | 500ms intervals × 3 steps | 2000ms | — | $187 → $142 → $94 (step animation, not smooth) |
| Auth buttons | 500ms | 400ms | out(ease) | Fade-in + slide-up |

#### Home Screen Animations
| Animation | Duration | Delay | Easing | Description |
|-----------|----------|-------|--------|-------------|
| Header entrance | 600ms | 100ms | out(ease) | Fade-in |
| Search row entrance | 450ms | 60ms + (index × 60ms) | out(ease) | Staggered fade-in + slide-up per row |
| Pending banner entrance | 400ms | — | out(cubic) | Slide-in from -20px top |
| Pending banner pulse | 1600ms loop | — | inOut(ease) | Pulsing dot (searching state) |
| Insights entrance | 600ms | 300ms | out(ease) | Fade-in for insight section |
| Onboarding entrance | 600ms | 150ms | out(ease) | Main onboarding fade-in |
| "With AirFare" reveal | 600ms | 550ms after onboarding | out(ease) | Staggered dramatic reveal |
| CTA press | instant | — | — | Scale to 0.97 on press-in, 1.0 on release |

#### Search Wizard Animations
| Animation | Duration | Delay | Easing | Description |
|-----------|----------|-------|--------|-------------|
| Section expand | 300ms | — | inOut(ease) | maxHeight 0→600 + opacity 0→1 |
| Section collapse | 300ms | — | inOut(ease) | maxHeight 600→0 + opacity 1→0 (200ms faster) |
| Toggle switch knob | 200ms | — | ease | translateX slide for on/off |
| Loading overlay | 250ms | — | ease | Fade-in of full-screen overlay |

#### Credits Screen Animations
| Animation | Duration | Delay | Easing | Description |
|-----------|----------|-------|--------|-------------|
| Balance entrance | 500ms | 100ms | out(ease) | Fade-in |
| Number ticker | 600ms | after entrance | easing | Animated counting from 0 to final balance |
| Purchase button | — | — | — | Spinner + text change to "Verifying..." |

#### Settings Screen Animations
| Animation | Duration | Delay | Easing | Description |
|-----------|----------|-------|--------|-------------|
| Identity entrance | 500ms | 80ms | out(ease) | Fade-in + slide-up |
| Toggle switch | 200ms | — | ease | Knob translateX slide |
| Bottom sheet | ~300ms | — | spring | Slide-up from bottom + backdrop fade |

#### Global Animations
| Animation | Duration | Delay | Easing | Description |
|-----------|----------|-------|--------|-------------|
| Toast entrance | 250ms | — | out(ease) | Fade-in + slide-up from below nav bar |
| Toast exit | 200ms | 3s auto | ease | Fade-out |
| Tab transitions | ~250ms | — | — | Fade between tab screens |
| Stack transitions | ~350ms | — | spring | iOS slide-in/out for detail screens |
| Button press | instant | — | — | Scale 0.95-0.98 on press |
| Loading dots | 1000ms × 2 | staggered | inOut(ease) | Opacity 0.35↔1 pulsing loop |

#### Splash Screen Animation (AnimatedSplashGate)
| Step | Duration | Delay | Description |
|------|----------|-------|-------------|
| 1 | — | 300ms | Initial pause |
| 2 | 1200ms | — | Scan bar sweeps across screen |
| 3 | 200ms | 1000ms | Scan bar fades out |
| 4 | 500ms | 600ms | Logo + text reveal |
| 5 | — | 400ms | Hold before exit |
| 6 | 300ms | — | Scale 1.08 + fade-out exit |

### Logo Hero Animation (LogoHero)
- **Outer glow** (280px): Pulsing scale 1.0→1.08→1.0 (2400ms each direction)
- **Mid glow ring** (220px): Static, subtle border
- **Orbital ring** (180px): Static decorative circle
- **Inner halo** (140px): Bright glow with shadow
- **6 floating dots**: Scattered accent dots in blue/indigo/cyan (3-6px)

---

## 5. Interaction Design

### Haptic Feedback System
Every interactive element provides tactile feedback. The app includes a global haptic toggle (in Settings) that enables/disables all vibrations. When enabled:

| Interaction | Haptic Type |
|------------|-------------|
| Standard button tap | Light |
| Navigation tab change | Light |
| Back button | Light |
| Primary CTA (Search, Purchase, Save) | Medium |
| Toggle switch | Light |
| Successful action (login, purchase) | Success pattern |
| Failed action (auth error, search fail) | Error pattern |
| Destructive action (delete account) | Heavy |
| Pull-to-refresh | Light |

### Touch Feedback
- **Buttons**: Scale to 0.95-0.98 on press, return to 1.0 on release
- **List rows**: Subtle opacity change (0.04 blue overlay) on press
- **Back button**: Scale 0.95 + opacity 0.7 on press
- **Add button**: Scale 0.92 on press
- **Disabled elements**: 60% opacity, no haptic, no visual press feedback

### Navigation Patterns
- **Tab screens** (Home, Credits, Settings): Fade transition, no swipe-back gesture
- **Stack screens** (Search Wizard, Search Details): iOS slide transition, swipe-back enabled
- **Modals** (Airport Search, Edit Name): Bottom sheet slide-up with backdrop
- **External links** (Book on Google Flights): Opens in browser

### Loading & Feedback Patterns
- **Immediate feedback**: Button shows spinner instantly on tap
- **Progress communication**: "Searching JFK → LAX..." with animated dots
- **Completion feedback**: Banner changes state, toast notification appears
- **Error recovery**: Error state shown with retry option or dismiss button

---

## 6. Copy & Messaging Architecture

### Greeting System
Time-based greetings on the Home screen:
- Before noon: "Good morning"
- Noon to 5pm: "Good afternoon"
- After 5pm: "Good evening"

### Smart Headlines
Dynamic data-driven headlines that surface the most relevant insight:
- Price drop: "**JFK to LAX** dropped **$12**"
- Price spike: "**JFK to LAX** jumped **$45**"
- Best deal: "Cheapest: **JFK to LAX** at **$142**"
- Active tracking: "Watching **3 routes**"
- All paused: "Your searches are paused"
- No data: "Watching 0 routes"

### Onboarding Story (Empty State)
The onboarding is structured as a before/after narrative:
1. **Problem**: "You pick the dates. We find the deal."
2. **Without AirFare**: Manual checking (4 example dates with prices + "200 more combinations to check")
3. **Visual connector**: Arrow pointing down
4. **With AirFare**: "200+ combos searched in seconds" / "Cheapest found: Mar 18 — $241" / "Price drops? We'll notify you instantly"
5. **CTA**: "Find my cheapest flight"

### Status Language
- **Active tracking**: "Checked 2h ago", "14d left", "Expires today", "Expires tomorrow"
- **Paused**: "Paused"
- **Searching**: "Searching JFK → LAX...", "We'll let you know when it's ready"
- **Complete**: "Search complete!", "Tap to view results"
- **Error**: "Search failed", "Something went wrong"

### Credits Language
- Balance: "CREDITS AVAILABLE"
- Packs use simple names: "Starter", "Standard", "Pro", "Power"
- Unit price shown: "$0.10/credit"
- Purchase feedback: "Verifying..." → success toast
- Transaction types: "Welcome bonus", "Credits purchased", "Search", "Tracking", "Refund"

### Destructive Action Language
- Sign out: Simple "Sign out" with red styling
- Delete account: "Permanently remove your account and all data" (description) + confirmation dialog with explicit consequences: "This will permanently delete your account, all saved searches, and credit history. This cannot be undone."

### Missing/Placeholder Content
- Privacy Policy: "Coming Soon" alert
- Terms of Service: "Coming Soon" alert
- Some airline logos: Falls back to airline code text

---

## 7. Component Library Summary

### Shared Components
| Component | Purpose | Visual Style |
|-----------|---------|-------------|
| MeshBackground | Multi-layer gradient backdrop | 4-layer sky-blue gradients |
| BottomNavBar | Main navigation | Frosted glass pill, 4 tabs + center add button |
| AppButton | Primary/secondary CTA | Blue solid or white outlined, 10px radius |
| BackButton | Navigate back | Frosted glass circle, 38px, hand-drawn chevron |
| CreditsBadge | Credit balance display | Light blue pill with amber coin icon |
| Toast | Notification popup | Floating rounded card above nav bar, 3 types |
| OfflineBanner | Network status | Red banner when offline |
| AirlineLogo | Airline brand display | Logo image with text fallback |

### Flight-Specific Components
| Component | Purpose |
|-----------|---------|
| RoundTripStrip | Two-leg flight result display |
| OneWayStrip | Single-leg flight result display |
| FlightResultCard | Detailed flight card with booking link |
| FlightPanel | Expandable flight detail panel |

### Welcome/Animation Components
| Component | Purpose |
|-----------|---------|
| FlightPriceWave | 7×6 animated scanning dot grid |
| LogoHero | Logo with pulsing glow rings |
| AnimatedSplashGate | Startup splash with scan animation |
| AmbientHeader | Sky scene with planes/clouds (available, not currently active) |

### Form Components
| Component | Purpose |
|-----------|---------|
| AirportSearchModal | Airport selection with search |
| AirlineFilterStep | Airline include/exclude filter |
| SearchingOverlay | Full-screen loading during search |
| PendingSearchBanner | Inline search status banner |
| AnimatedSection | Expanding/collapsing form sections |

---

## 8. State & Data Architecture (UX-relevant)

### What the User "Sees" as State
- **Auth state**: Signed in or not (determines Welcome vs Home)
- **Credit balance**: Visible on Credits screen, CreditsBadge, and Settings quick stats
- **Saved searches**: List on Home, each with price, trend, tracking status
- **Pending search**: Banner on Home showing search-in-progress
- **Network status**: Offline banner when disconnected
- **Haptic preference**: Toggle in Settings, affects all interactions
- **Notification preference**: Toggle in Settings

### Data Refresh Patterns
- **Pull-to-refresh**: Available on Home and Credits screens
- **Auto-refresh**: Credits balance refreshes on auth change
- **Background processing**: Price checks happen server-side every 4 hours; user sees updated prices on next load
- **No real-time push**: User must pull-to-refresh or re-open app to see updated prices (notifications planned but marked "Coming Soon" in push notification setup)

---

## 9. Current Gaps & Observations

These are factual observations about the current state, not recommendations:

1. **No onboarding tutorial**: User goes directly from auth to empty home screen with onboarding text
2. **No push notifications implemented**: Toggle exists in Settings but Privacy Policy and ToS are "Coming Soon"
3. **No user avatar upload**: Avatar is auto-generated from initials
4. **No search editing**: Changing filters requires a completely new search (costs credits)
5. **No price alerts configuration**: No per-search alert thresholds
6. **No flight booking within app**: All booking redirects to Google Flights externally
7. **No social/sharing features**: Cannot share deals with others
8. **No dark mode**: App is light-only (except Welcome screen)
9. **Credits purchase is simulated**: In-app purchase flow exists but actual payment processing is placeholder
10. **AmbientHeader component exists but is unused**: Animated sky scene with planes and clouds is built but not displayed on any current screen
11. **Portrait only**: No landscape support
12. **iOS-focused**: Apple Sign-In is iOS-only; Google Sign-In works cross-platform
