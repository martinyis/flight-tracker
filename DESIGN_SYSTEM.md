# Skylens Design System

> The definitive visual and interaction language for the Skylens flight tracker app.
> This document is the single source of truth for building new screens and components.
> Follow it exactly. When in doubt, re-read the principles.

---

## Table of Contents

1. [Philosophy and Principles](#1-philosophy-and-principles)
2. [Color System](#2-color-system)
3. [Typography](#3-typography)
4. [Spacing and Layout](#4-spacing-and-layout)
5. [Surfaces and Depth](#5-surfaces-and-depth)
6. [Iconography](#6-iconography)
7. [Component Patterns](#7-component-patterns)
8. [Screen Patterns](#8-screen-patterns)
9. [Motion and Animation](#9-motion-and-animation)
10. [Voice and Tone](#10-voice-and-tone)
11. [Loading and Empty States](#11-loading-and-empty-states)
12. [Accessibility](#12-accessibility)

---

## 1. Philosophy and Principles

### The Emotional Core

Skylens should feel like **you are already in the sky**. Not literally -- there are no cartoon planes, no stock photos of clouds, no blue-sky wallpapers. The sky feeling comes from the quality of light: bright, warm, luminous, airy. Surfaces feel like they are made of frosted glass and light. The palette is blue-white with warmth. The overall effect is abstract luminosity -- inspired by Apple visionOS but distinctly its own.

### The Personality

Skylens is **a knowledgeable friend who helps you find cheap flights**. Not a corporate tool. Not a cute mascot. Not an AI assistant pretending to be human. A friend who is good at this, has your back, and does not overwhelm you with information. The app is warm, direct, and confident.

### The Five Design Principles

**1. Show what matters, hide the rest.**
Inspired by Hinge's chat tab: display only the essential information at first glance. If a detail is secondary, de-emphasize it visually or make it accessible through interaction. Never show six things when three will do.

**2. Content is the interface.**
No cards wrapping content. No containers for the sake of containers. Content sits directly on the background, separated by spacing, typography, and subtle dividers. The user's data IS the UI -- routes, prices, dates -- not the boxes around them.

**3. Light and air, not decoration.**
Every visual element must earn its place. No decorative borders, no ornamental shadows, no ambient animations that serve no purpose. The design feels spacious and luminous because of what is NOT there, not because of what is added.

**4. Context-appropriate density.**
Not every screen has the same information density. The home screen breathes. The search results screen is dense and functional. The wizard is conversational. Each screen gets the density that serves its purpose. There is no single "correct" density -- there is only the right density for the task at hand.

**5. Motion is communication, not decoration.**
Every animation must communicate something: a state change, a transition, progress, or a moment of delight at a specific trigger. If an animation is purely decorative and could be removed without losing meaning, remove it.

### The Anti-Patterns (Things Skylens Never Does)

- **Never wraps content in cards.** No rounded-rectangle containers with padding and shadows holding content. Content lives on the surface.
- **Never uses skeleton loading screens.** Skeletons are generic and boring. Skylens uses custom animated loading states with purposeful motion and friendly copy.
- **Never uses generic spinners** (ActivityIndicator) as the primary loading UI on full screens. Small inline spinners on buttons during network requests are acceptable.
- **Never uses cartoon or literal sky imagery.** No cloud illustrations, no airplane emojis rendered large, no sky gradient wallpapers. The sky feeling is abstract.
- **Never uses "I" in copy.** The app does not pretend to be a person.
- **Never puts a border-radius on a content list container to make it "card-like."** If a list of items needs visual grouping, use a section header and spacing, not a containing box.

---

## 2. Color System

### Philosophy

The palette is built around the sky metaphor: warm blues, luminous whites, and a secondary warm accent for emotional moments. The primary blue is shifted warmer than the Tailwind default to feel more like an actual clear sky and less like a generic SaaS product.

### Primary Palette

| Token                  | Hex       | Usage                                              |
|------------------------|-----------|-----------------------------------------------------|
| `color.primary.500`    | `#2F9CF4` | Primary actions, links, active states, brand accent. Warmer "true sky" blue. |
| `color.primary.600`    | `#1A7ED4` | Pressed/hover states for primary elements           |
| `color.primary.700`    | `#1466B0` | High-contrast text on light backgrounds when blue text is needed |
| `color.primary.400`    | `#5CB8F7` | Lighter interactive accents, secondary highlights    |
| `color.primary.300`    | `#8FD0FA` | Subtle tints, background accents, pill badges        |
| `color.primary.200`    | `#BAE1FC` | Very light tints, divider accents                    |
| `color.primary.100`    | `#E0F2FE` | Backgrounds, washes, container tints                 |
| `color.primary.50`     | `#F0F8FF` | Lightest background tint                             |

### Warm Accent Palette

A warm amber-to-peach secondary palette adds visual warmth and breaks the all-blue monotony. Used for specific emotional moments: price drops, deals, positive reinforcement, and occasional UI accents.

| Token                  | Hex       | Usage                                              |
|------------------------|-----------|-----------------------------------------------------|
| `color.warm.500`       | `#F59E0B` | Primary warm accent -- deal badges, coin icons, positive highlights |
| `color.warm.400`       | `#FBBF24` | Lighter warm accent                                 |
| `color.warm.300`       | `#FCD34D` | Subtle warm highlights                              |
| `color.warm.100`       | `#FEF3C7` | Warm background tint                                |
| `color.warm.600`       | `#D97706` | Pressed/darker warm states                          |

### Neutral Palette (Slate Scale)

| Token                  | Hex       | Usage                                              |
|------------------------|-----------|-----------------------------------------------------|
| `color.neutral.900`    | `#0F172A` | Primary text, maximum contrast                      |
| `color.neutral.800`    | `#1E293B` | Secondary headings, heavy emphasis                  |
| `color.neutral.700`    | `#334155` | Tertiary text, de-emphasized content                |
| `color.neutral.600`    | `#475569` | Body text on light backgrounds                      |
| `color.neutral.500`    | `#64748B` | Secondary text, descriptions, meta information      |
| `color.neutral.400`    | `#94A3B8` | Placeholder text, disabled states, timestamps       |
| `color.neutral.300`    | `#CBD5E1` | Borders, dividers, separator dots                   |
| `color.neutral.200`    | `#E2E8F0` | Subtle borders, input borders (unfocused)           |
| `color.neutral.100`    | `#F1F5F9` | Light backgrounds, pressed states on white          |
| `color.neutral.50`     | `#F8FAFC` | Near-white surface                                  |

### Semantic Colors

| Token                  | Hex       | Usage                                              |
|------------------------|-----------|-----------------------------------------------------|
| `color.success.500`    | `#22C55E` | Price drops, nonstop flights, positive states        |
| `color.success.600`    | `#16A34A` | Success text on light backgrounds                   |
| `color.success.100`    | `#DCFCE7` | Success background tint                             |
| `color.success.bg`     | `rgba(34, 197, 94, 0.08)` | Subtle success background               |
| `color.warning.500`    | `#F59E0B` | Stops indicator, caution states                     |
| `color.warning.600`    | `#D97706` | Warning text                                        |
| `color.warning.100`    | `#FEF3C7` | Warning background tint                             |
| `color.error.500`      | `#EF4444` | Errors, destructive actions, price increases        |
| `color.error.600`      | `#DC2626` | Error text, destructive button text                 |
| `color.error.100`      | `#FEE2E2` | Error background tint                               |
| `color.error.bg`       | `rgba(239, 68, 68, 0.08)` | Subtle error background                 |

### Background System

The main app background is NOT a flat color. It is a multi-layer gradient wash that creates the luminous sky feeling.

```
Layer 1 (base diagonal):   #DCEEFB -> #EBF3FE -> #F4F8FF -> #FAFCFF
  Start: top-left, End: bottom-right

Layer 2 (top-down blue tint): rgba(143, 208, 250, 0.12) -> transparent
  Start: top-center, End: 55% down

Layer 3 (warm shift from bottom-right): transparent -> rgba(165, 180, 252, 0.06)
  Start: 40% down left, End: bottom-right

Layer 4 (faint cyan from right): transparent -> rgba(103, 232, 249, 0.05) -> transparent
  Start: right edge 20% down, End: left edge 60% down
```

**Implementation note:** This is the `MeshBackground` component. Every main app screen uses this as the base layer. NEVER use a flat white or flat blue background on main app screens.

### Color Usage Rules

**DO:**
- Use `color.primary.500` (#2F9CF4) for interactive elements: buttons, links, active tab indicators
- Use `color.neutral.900` (#0F172A) for primary text -- it has maximum contrast against the light background
- Use `color.neutral.500` (#64748B) for secondary/meta text
- Use `color.neutral.400` (#94A3B8) for tertiary/timestamp text
- Use `color.success.500` (#22C55E) for price drops and positive price indicators
- Use `color.warm.500` (#F59E0B) for the credits coin icon and deal-related accents
- Use rgba values for subtle background tints (frosted surfaces, pressed states)

**DON'T:**
- Don't use #3B82F6 (old Tailwind blue-500) -- it has been replaced by the warmer #2F9CF4
- Don't use flat white (#FFFFFF) as a screen background -- always use the mesh gradient
- Don't create new blues outside the primary palette -- stay within the defined scale
- Don't use color as the ONLY differentiator for states -- always pair with shape, icon, or text changes

---

## 3. Typography

### Font Family

**Outfit** remains the sole typeface. It is a geometric sans-serif with enough personality at heavy weights and enough clarity at regular weights. Its slightly rounded terminals give warmth without being childish. There is no need for a second font -- Outfit's full weight range provides all the hierarchy needed.

### Font Weight Map

| Token               | Weight | Outfit Variant         | Usage                                    |
|----------------------|--------|------------------------|------------------------------------------|
| `font.thin`          | 100    | Outfit_100Thin         | Reserved -- do not use in production UI  |
| `font.extraLight`    | 200    | Outfit_200ExtraLight   | Reserved -- do not use in production UI  |
| `font.light`         | 300    | Outfit_300Light        | Large decorative numbers only            |
| `font.regular`       | 400    | Outfit_400Regular      | Body text, descriptions, meta text       |
| `font.medium`        | 500    | Outfit_500Medium       | Secondary labels, input text, nav labels |
| `font.semiBold`      | 600    | Outfit_600SemiBold     | Emphasized body, section headers, badges |
| `font.bold`          | 700    | Outfit_700Bold         | Screen titles, button labels, key data   |
| `font.extraBold`     | 800    | Outfit_800ExtraBold    | Prices, airport codes, hero numbers      |
| `font.black`         | 900    | Outfit_900Black        | Brand name "Skylens" only                |

### Type Scale

| Token                | Size  | Weight     | Letter Spacing | Line Height | Usage                          |
|----------------------|-------|------------|----------------|-------------|--------------------------------|
| `type.hero`          | 36px  | ExtraBold  | -1.2           | 40          | Hero prices, main balance      |
| `type.display`       | 30px  | Bold       | -0.6           | 36          | Screen greeting, large headings|
| `type.heading1`      | 24px  | ExtraBold  | -0.8           | 28          | Airport codes, section prices  |
| `type.heading2`      | 20px  | Bold       | -0.4           | 24          | Empty state titles, sub-headings|
| `type.heading3`      | 18px  | Bold       | -0.2           | 22          | Screen titles in nav bar       |
| `type.body`          | 16px  | Regular    | 0              | 22          | Primary body text              |
| `type.bodyMedium`    | 16px  | Medium     | 0              | 22          | Emphasized body, input text    |
| `type.secondary`     | 15px  | Medium     | 0.1            | 20          | Insight lines, descriptions    |
| `type.small`         | 14px  | SemiBold   | -0.1           | 18          | Airline names, compact data    |
| `type.smallRegular`  | 14px  | Regular    | 0              | 18          | Error messages, help text      |
| `type.caption`       | 13px  | Medium     | -0.1           | 16          | Compact times, secondary labels|
| `type.captionBold`   | 13px  | Bold       | 0.1            | 16          | Button text (small), book links|
| `type.micro`         | 12px  | Medium     | -0.1           | 16          | Timestamps, date labels, meta  |
| `type.microSemiBold` | 12px  | SemiBold   | 0.1            | 16          | Badge text, pill labels        |
| `type.tag`           | 11px  | Bold       | 0.5-0.8        | 14          | Uppercase labels (BEST, OUTBOUND), price sublabels |
| `type.nano`          | 10px  | SemiBold   | 0.3            | 12          | Paused/tracking pills, tiny status text |

### Typography Rules

**DO:**
- Use negative letter-spacing on large headings and prices (it tightens them and feels premium)
- Use positive letter-spacing on small uppercase labels (improves readability at tiny sizes)
- Use ExtraBold (800) for prices -- this is a signature pattern. Prices should always feel bold and immediate
- Use Regular (400) for body descriptions and meta text -- it is highly legible
- Pair Bold headings with Regular/Medium body text for clear hierarchy

**DON'T:**
- Don't use Thin (100) or ExtraLight (200) in the main app -- they are too fragile on mobile screens
- Don't use more than 2 different weights in a single component -- it gets noisy
- Don't center-align body text or multi-line descriptions -- left-align everything except hero elements and empty state text
- Don't use ALL CAPS for anything larger than `type.tag` size (11px). Uppercase is reserved for tiny labels
- Don't apply fontStyle: "italic" -- Outfit has no italic variants. If emphasis is needed, change the weight

---

## 4. Spacing and Layout

### Base Unit

All spacing is based on a **4px grid**. Every margin, padding, gap, and size should be a multiple of 4.

### Spacing Scale

| Token       | Value | Usage                                            |
|-------------|-------|--------------------------------------------------|
| `space.xs`  | 4px   | Tight gaps (between icon and text in a row)      |
| `space.sm`  | 8px   | Small gaps (between related items, inner padding)|
| `space.md`  | 12px  | Medium gaps (between list items in dense views)  |
| `space.base`| 16px  | Standard gaps (between list items, form fields)  |
| `space.lg`  | 20px  | Screen edge padding, generous gaps               |
| `space.xl`  | 24px  | Section separators, above/below headings         |
| `space.2xl` | 32px  | Major section breaks, large whitespace           |
| `space.3xl` | 40px  | Screen top/bottom padding in spacious layouts    |
| `space.4xl` | 48px  | Hero spacing, empty state vertical centering     |

### Screen Edge Padding

**20px** on both sides. This is the standard for all screens. It provides enough breathing room without wasting horizontal space on smaller devices.

Exception: edge-to-edge elements (flight strips, the bottom nav, full-bleed dividers) ignore screen padding and extend to the screen edges.

### Touch Targets

**Minimum 44pt height** for all interactive elements. This is the Apple Human Interface Guidelines minimum and is non-negotiable. Buttons, list rows, nav icons, toggle areas -- all 44pt or larger.

The bottom nav icons should have a touch area of at least 48x48pt even if the visible icon is smaller.

### Layout Rules

**DO:**
- Use `paddingHorizontal: 20` on ScrollView contentContainerStyle for screen content
- Use `gap` property (flexbox gap) for spacing between items in a row or column -- it is cleaner than margin
- Use `paddingBottom: 100-120` on scroll content to clear the bottom nav bar
- Vertically separate major sections with 24-32px
- Vertically separate items within a section with 12-16px

**DON'T:**
- Don't use padding less than 12px on interactive elements
- Don't let text get closer than 20px to the screen edge
- Don't create horizontal scrolling lists without at least 20px left padding to hint at the content
- Don't add both margin and padding to create spacing -- pick one approach per context

---

## 5. Surfaces and Depth

### The Surface Hierarchy

Skylens has three levels of visual depth:

**Level 0 -- The Background.**
The mesh gradient wash. This is always present. All content sits on this surface. It is never obscured except by Level 1 and Level 2 elements.

**Level 1 -- Content.**
Content (text, lists, images, inline elements) sits directly on Level 0. There is NO intermediate surface between background and content. Content does not have its own background panel or card. It is separated from other content by spacing and dividers.

**Level 2 -- Chrome and Overlays.**
The bottom nav bar, modal sheets, toast notifications, and the top status area (when content scrolls beneath a header). These are the ONLY elements that get frosted glass treatment and shadows.

### Frosted Glass

Used exclusively on Level 2 elements.

```
Implementation:
  <BlurView intensity={50-60} tint="light">
    <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.75)' }}>
      {children}
    </View>
  </BlurView>
```

**Apply frosted glass to:**
- The bottom navigation bar
- Modal overlays and bottom sheets
- Sticky/persistent headers where content scrolls beneath
- Toast notifications

**NEVER apply frosted glass to:**
- Individual list items or search rows
- Section containers or "cards"
- Buttons or small UI elements
- Anything in the content layer (Level 1)

### Shadows

Shadows are used sparingly and only for Level 2 elevation.

**Nav bar shadow:**
```
shadowColor: '#64748B'
shadowOffset: { width: 0, height: -4 }
shadowOpacity: 0.06
shadowRadius: 12
elevation: 8
```

**Modal shadow:**
```
shadowColor: '#0F172A'
shadowOffset: { width: 0, height: -8 }
shadowOpacity: 0.12
shadowRadius: 24
elevation: 16
```

**Primary CTA glow (signature detail):**
The main call-to-action button on key screens gets a soft blue glow beneath it, making it feel like it emits light.
```
shadowColor: '#2F9CF4'
shadowOffset: { width: 0, height: 6 }
shadowOpacity: 0.35
shadowRadius: 16
elevation: 8
```

**No other shadows.** Content items, list rows, secondary buttons, inputs, badges -- none of these get shadows.

### Dividers

Hairline dividers separate items within a list.

```
height: StyleSheet.hairlineWidth
backgroundColor: 'rgba(148, 163, 184, 0.2)'
marginHorizontal: 20   // inset from screen edges, or 0 for full-bleed
```

**DO:**
- Use hairline dividers between list items (flight results, transaction rows, search rows)
- Inset dividers by 20px (matching screen padding) for content lists
- Use full-bleed (no inset) dividers for edge-to-edge sections like flight strips

**DON'T:**
- Don't use thick (>1px) dividers
- Don't use colored dividers (no blue or accent-colored lines as separators)
- Don't use dividers AND large spacing together -- pick one. If spacing alone creates clear separation, skip the divider

### Borders

Borders are used on interactive form elements and subtle structural accents.

**Input borders (unfocused):**
```
borderWidth: 1
borderColor: 'rgba(148, 163, 184, 0.25)'  // very subtle
```

**Input borders (focused):**
```
borderWidth: 1.5
borderColor: '#2F9CF4'  // primary blue
```

**Structural accents (e.g., the route arrow circle, badge pills):**
```
borderWidth: 1
borderColor: 'rgba(47, 156, 244, 0.12)'  // barely visible primary tint
```

---

## 6. Iconography

### Icon Library

**Lucide React Native** is the icon library. All icons should come from this set for consistency.

### Style

- **Filled icons** for the bottom nav bar and primary UI indicators
- **Consistent stroke width:** 2-2.5 across the app. Do not mix thin (1.5) and thick (3) strokes
- **Icon sizes:**
  - Bottom nav: 24-26px
  - Inline with text: 16-18px
  - Decorative/empty state: 32-40px
  - Small badges/indicators: 12-14px

### Bottom Nav Icons

The three nav items need icons that are instantly understandable without labels:

| Tab       | Suggested Icon      | Reasoning                              |
|-----------|---------------------|----------------------------------------|
| Credits   | `Coins` or `Wallet` | Clearly communicates "money/credits"   |
| Add (+)   | `Plus`              | Universal "create new" action          |
| Profile   | `User` or `UserCircle` | Universal "me/settings" pattern     |

### Rules

**DO:**
- Use filled variants for active/selected nav states
- Ensure every icon's meaning is unambiguous without a label
- Use `color.primary.500` for active nav icons, `color.neutral.400` for inactive
- Keep icon sizes consistent within the same context (all nav icons same size, all inline icons same size)

**DON'T:**
- Don't use emoji as icons in the interface
- Don't mix icon libraries (no FontAwesome, no custom SVG icons alongside Lucide unless absolutely necessary)
- Don't use icons purely for decoration -- every icon should convey meaning
- Don't use outlined icons in the nav bar -- they look too thin at small sizes

---

## 7. Component Patterns

### Buttons

**Primary Button**
The main action button on any screen. Solid fill, high contrast.
```
backgroundColor: '#2F9CF4'
borderRadius: 12
paddingVertical: 16-18
paddingHorizontal: 20
minHeight: 48

Text: font.bold, 16px, #FFFFFF, letterSpacing: 0.2
```

Pressed state:
```
backgroundColor: '#1A7ED4'
transform: [{ scale: 0.97 }]
```

Disabled state:
```
backgroundColor: '#8FD0FA'   // primary.300, muted
Text color: rgba(255, 255, 255, 0.7)
No shadow
```

On hero/key screens (welcome, wizard completion), the primary button gets the blue glow shadow and optionally a gradient fill:
```
LinearGradient colors: ['#2F9CF4', '#06B6D4']  // sky blue to cyan
+ the CTA glow shadow defined in Surfaces section
```

**Secondary Button**
For secondary actions. Transparent background, subtle presence.
```
backgroundColor: 'transparent' or 'rgba(47, 156, 244, 0.06)'
borderRadius: 12
borderWidth: 1
borderColor: 'rgba(47, 156, 244, 0.15)'
paddingVertical: 16-18

Text: font.semiBold, 16px, '#1A7ED4'
```

Pressed state:
```
backgroundColor: 'rgba(47, 156, 244, 0.1)'
transform: [{ scale: 0.97 }]
```

**Destructive Button**
For dangerous actions (delete search, sign out).
```
backgroundColor: 'rgba(239, 68, 68, 0.06)'
borderRadius: 12
borderWidth: 1
borderColor: 'rgba(239, 68, 68, 0.2)'
paddingVertical: 16

Text: font.semiBold, 16px, '#DC2626'
```

**Text Button / Link**
For inline actions, "forgot password," secondary navigation.
```
No background, no border
paddingVertical: 8 (for touch target)

Text: font.medium, 14px, '#2F9CF4'
```

Pressed state: opacity 0.6

**Button Rules:**

**DO:**
- Use 12px borderRadius on all buttons (not full-pill, not sharp corners)
- Always include a pressed state with scale(0.97) and a visual change
- Keep button labels short -- 1-3 words maximum
- Use font.bold for primary buttons, font.semiBold for secondary/destructive

**DON'T:**
- Don't use gradients on buttons except for hero CTAs on key screens
- Don't put icons inside buttons unless it is the plus icon in the nav bar
- Don't make buttons full-width unless they are the only action on screen (wizard steps, auth screens)
- Don't stack more than 2 buttons vertically in a single area

### Text Inputs

```
backgroundColor: 'rgba(255, 255, 255, 0.65)'   // translucent white on mesh bg
borderRadius: 12
borderWidth: 1
borderColor: 'rgba(148, 163, 184, 0.25)'
paddingHorizontal: 20
paddingVertical: 16
fontSize: 16
fontFamily: font.regular
color: '#0F172A'
```

Focused state:
```
borderColor: '#2F9CF4'
borderWidth: 1.5
backgroundColor: 'rgba(255, 255, 255, 0.85)'   // slightly more opaque
```

Placeholder text: `color: '#94A3B8'` (neutral.400)

**Field labels** sit above the input:
```
fontFamily: font.semiBold
fontSize: 15
color: '#0F172A'
marginBottom: 8
letterSpacing: 0.2
```

For the search wizard, field labels are conversational:
- "Where are you flying from?" instead of "Origin"
- "Where to?" instead of "Destination"
- "When do you want to go?" instead of "Departure dates"
- "How long do you want to stay?" instead of "Trip duration"

### Bottom Navigation Bar

The bottom nav is a single unified bar with 3 items. It uses frosted glass (Level 2 surface).

**Structure:**
```
<BlurView intensity={50} tint="light">
  <View style={{
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: safeAreaInsets.bottom,  // respect home indicator
    paddingTop: 8,
    height: 56 + safeAreaInsets.bottom,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(148, 163, 184, 0.15)',
    // shadow
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  }}>
```

**Left item (Credits):** Filled icon, 24px. Tapping navigates to credits screen.
- Active: `color.primary.500`
- Inactive: `color.neutral.400`

**Center item (Add Search):** The prominent action.
- A circle or rounded-square, 52x52px, filled with `color.primary.500`
- Raised ~8px above the bar's content baseline (using negative marginTop or a wrapper)
- Contains a white `Plus` icon, 24px, strokeWidth: 2.5
- Has the blue glow shadow:
  ```
  shadowColor: '#2F9CF4'
  shadowOffset: { width: 0, height: 4 }
  shadowOpacity: 0.3
  shadowRadius: 12
  ```
- Pressed state: scale(0.92), slightly darker blue

**Right item (Profile):** Filled icon, 24px. Tapping navigates to profile/settings.
- Active: `color.primary.500`
- Inactive: `color.neutral.400`

**No labels.** Icon-only. The icons must be descriptive enough on their own.

### Pills and Badges

For status indicators, tags, and small labels.

**Standard pill:**
```
paddingHorizontal: 10
paddingVertical: 4
borderRadius: 12
backgroundColor: varies by context
```

Examples:
- Price drop: `bg: rgba(34, 197, 94, 0.08)`, `border: rgba(34, 197, 94, 0.2)`, text: `#16A34A`
- Price up: `bg: rgba(239, 68, 68, 0.08)`, `border: rgba(239, 68, 68, 0.2)`, text: `#EF4444`
- Tracking active: `bg: rgba(47, 156, 244, 0.08)`, `border: rgba(47, 156, 244, 0.15)`, text: `#2F9CF4`
- Paused: `bg: rgba(148, 163, 184, 0.08)`, text: `#94A3B8`
- Best/cheapest: `bg: rgba(34, 197, 94, 0.08)`, text: `#16A34A`, uppercase, bold

Text: `font.semiBold` or `font.bold`, 10-11px, uppercase with letter-spacing 0.3-0.8

### Credit Badge (Global)

The credits badge appears in the bottom nav bar's credits tab icon area OR as a small inline element. It shows the user's current balance.

```
Coin icon: 18x18 circle, backgroundColor: '#F59E0B' (warm accent), white Coins icon inside (12px)
Balance text: font.semiBold, 14px, '#1A7ED4'
Layout: row, icon + text, gap: 5
```

### Toast Notifications

For price drop alerts and transient messages. Appears at the top of the screen, slides down.

```
Structure: frosted glass bar (BlurView)
backgroundColor: 'rgba(255, 255, 255, 0.85)'
borderRadius: 16
marginHorizontal: 20
paddingHorizontal: 16
paddingVertical: 14
borderWidth: 1
borderColor: 'rgba(148, 163, 184, 0.15)'

// Shadow
shadowColor: '#0F172A'
shadowOffset: { width: 0, height: 4 }
shadowOpacity: 0.08
shadowRadius: 16
```

Content layout: icon on left (contextual -- green arrow-down for price drop, etc.), text on right.
Title: `font.semiBold, 14px, #0F172A`
Body: `font.regular, 13px, #64748B`

Auto-dismisses after 4 seconds. Tapping navigates to the relevant screen.

Animation: slides down from above the safe area with a spring-based ease (Reanimated `withSpring`).

### Modal / Bottom Sheet

For airport search, filter selection, confirmations.

```
Backdrop: rgba(15, 23, 42, 0.4)   // dark overlay
Sheet: BlurView, intensity: 60, tint: 'light'
  backgroundColor: 'rgba(255, 255, 255, 0.92)'
  borderTopLeftRadius: 24
  borderTopRightRadius: 24
  paddingTop: 12   // space for drag handle
  paddingHorizontal: 20

Drag handle:
  width: 36
  height: 4
  borderRadius: 2
  backgroundColor: '#CBD5E1'
  alignSelf: 'center'
  marginBottom: 16
```

Shadow on the sheet:
```
shadowColor: '#0F172A'
shadowOffset: { width: 0, height: -8 }
shadowOpacity: 0.12
shadowRadius: 24
```

Animation: slides up with spring-based ease. Backdrop fades in simultaneously.

---

## 8. Screen Patterns

### Home Screen ("The Briefing")

The home screen combines a smart summary with a generous saved-search list.

**Structure (top to bottom):**

1. **Safe area + mesh background** -- standard for all screens

2. **Greeting + insight line** (the briefing)
   - Greeting: `type.display` (30px, Bold). "Good morning" / "Good afternoon" / "Good evening"
   - Insight: `type.secondary` (15px, Medium, `color.neutral.500`). Dynamic based on search data:
     - Zero searches: "Let's find your first deal"
     - Has price drops: "2 prices dropped since yesterday"
     - All stable: "3 searches tracking prices for you"
     - All paused: "All searches paused"
   - Padding: 24px horizontal, 20px top, 16px bottom

3. **Saved search rows**
   Each saved search is a full-width tappable row. No cards, no containers. Content sits directly on the background.

   Per row:
   - **Route:** ExtraBold, 20-22px. "JFK -> LAX" or abbreviated city names. Left-aligned
   - **Price:** ExtraBold, 24px. The cheapest found price. Right-aligned on the same line as the route, or on a second line with generous size
   - **Trend indicator:** Small pill next to or below price. Green down-arrow + amount for drops, red up-arrow for increases, nothing if stable
   - **Meta line:** Regular, 12-13px, `color.neutral.400`. Date range, number of nights, number of results. One line
   - **Divider:** Hairline, below each row

   The whole row is the tap target (min 44pt height, likely 72-80pt with padding). Tapping navigates to the search detail screen.

   Rows have no visible buttons, no chevron, no icons per row (beyond the trend indicator pill). The simplicity IS the design.

   Spacing between rows: 0 (rows are separated only by the hairline divider). Vertical padding within each row: 16-20px.

4. **Empty state** (zero searches)
   - Centered vertically in the available space
   - A subtle abstract icon or the Skylens brand icon, 40-48px, in `color.neutral.300` or `color.primary.300`
   - Title: `type.heading2` (20px, Bold). "Nothing to report yet"
   - Subtitle: `type.secondary` (15px, Regular, `color.neutral.500`). "Tap + to start tracking a flight"
   - No button in the empty state -- the plus in the nav bar is the action

5. **Bottom nav bar** -- always visible, frosted glass

**DO:**
- Lead with the insight line -- it gives the screen purpose even with few searches
- Keep each search row to 2-3 lines of information maximum
- Make the entire row tappable with no separate sub-buttons

**DON'T:**
- Don't show airline logos on the home screen rows -- save that detail for the search detail screen
- Don't show "last checked" timestamps on the home screen -- it is clutter. Save for the detail screen
- Don't show tracking duration remaining on the home screen rows
- Don't add action buttons (delete, pause, refresh) to home screen rows -- those live on the detail screen

### Search Detail Screen

The dense, functional screen. This is where information density is appropriate.

**Structure (top to bottom):**

1. **Header area**
   - Back button (top-left)
   - Route as the hero: large airport codes with the route arrow visualization between them
   - Price: hero-sized, centered. The cheapest found price with trend delta pill
   - Meta: date range, nights, result count -- one line below price

2. **Filter/sort controls** (if applicable)
   - Inline horizontal chips or a simple dropdown-style control
   - Sits between the header and the results list

3. **Flight results (FlightStrip pattern)**
   - Edge-to-edge rows, no cards
   - Zebra striping: even rows transparent, odd rows `rgba(148, 163, 184, 0.03)`
   - Hairline dividers between rows (full-bleed, no inset)
   - The cheapest result gets visual differentiation: a subtle green accent bar at the top (2.5px gradient), faint green background tint, and a "BEST" uppercase label
   - Each row shows: price (left, large), airline logo + name + compact leg info (center), expand chevron (right)
   - Accordion expand reveals full flight details: departure/arrival times, duration, stops, flight path visualization, booking buttons
   - The entire collapsed row is the tap target for expanding

4. **Bottom nav bar**

### Search Wizard (Add Search)

A multi-step form with conversational headers. Each step feels like a question from the friend.

**Step structure:**
- **Conversational header:** `type.heading2` (20px, Bold) or `type.display` (larger for the first step). Examples:
  - "Where are you flying from?"
  - "Where to?"
  - "When do you want to go?"
  - "How long do you want to stay?"
  - "Any preferences?" (for filters)
- **Input area:** The appropriate input for the step (airport search field, date picker, number stepper, filter chips)
- **Continue button:** Primary button at the bottom. Only enabled when the step has valid input.
- **Progress indication:** Subtle dots or a thin progress bar at the top showing which step the user is on. Not numbered -- just visual position.

**Transition between steps:** Horizontal slide animation. The current step slides out left, the next step slides in from the right. Use Reanimated for smooth 60fps transitions.

**Back navigation:** A back arrow in the top-left navigates to the previous step. The back button should also trigger the reverse animation (slide right).

**DO:**
- Keep one question per step -- do not combine steps to "save taps"
- Disable the continue button until valid input is provided
- Show a live preview of what the user has entered (e.g., after selecting origin and destination, show "JFK -> LAX" persistently at the top)

**DON'T:**
- Don't show step numbers ("Step 2 of 5") -- it makes the process feel long
- Don't use a progress percentage -- use subtle dots that show relative position
- Don't allow skipping required steps

### Credits Screen

No cards. The screen is typographic and list-driven.

**Structure (top to bottom):**

1. **Header:** "Credits" title with back button

2. **Balance display**
   - The balance is a large typographic statement sitting directly on the mesh background
   - Number: `type.hero` (36px) or larger, ExtraBold, `color.neutral.900`
   - Label below: "credits available" -- `type.micro` (12px, SemiBold, `color.neutral.400`), uppercase, letter-spaced
   - No containing box, no card, no background panel. Just the number on the background.
   - Optionally, a subtle warm glow or accent behind the number using `color.warm.500` at very low opacity

3. **Buy Credits section**
   - Section header: "Top up" or "Buy credits" -- `type.heading3` (18px, Bold)
   - Credit packs as a vertical list (not a 2x2 grid of cards):
     - Each pack is a full-width tappable row
     - Left: pack name (Bold) + credit amount (Regular, smaller)
     - Right: price (SemiBold, `color.primary.500`)
     - The "best value" pack gets a small pill badge
     - Hairline divider between rows
   - Alternative: horizontal scroll of pack options if a more visual approach is desired. Each option is a compact vertical block (not a full card -- no shadow, no heavy border, just a subtle background tint on the selected/highlighted one)

4. **Activity log**
   - Section header: "Recent activity" -- `type.heading3` (18px, Bold)
   - Transaction rows:
     - Left: type label (SemiBold, 14px) + note if present (Regular, 12px, `color.neutral.500`)
     - Right: amount with +/- prefix, colored (green for additions, red for deductions)
     - Hairline divider between rows
   - No containing wrapper around the transaction list. Rows sit directly on the background.

### Profile / Settings Screen

Minimal for now. A list of options and account information.

- User email or name at the top
- List of settings rows (notification preferences, etc.) as simple tappable rows with hairline dividers
- "Sign Out" as a destructive button at the bottom, separated by generous spacing
- Everything sits on the mesh background -- no card containers

---

## 9. Motion and Animation

### Principles

1. **Every animation communicates.** If you cannot explain what the animation tells the user, remove it.
2. **Fast and responsive.** Most transitions should complete in 200-350ms. Nothing should feel sluggish.
3. **Spring-based by default.** Use Reanimated `withSpring` or `withTiming` with `Easing.out(Easing.cubic)` for natural-feeling motion. Avoid linear easing for UI transitions.
4. **Build with React Native Animated, Reanimated, and SVG.** No Lottie files, no GIF animations, no CSS animations. Everything is code-driven.

### Standard Transitions

**Screen push/pop (stack navigation):**
Default Expo Router transitions. Do not override unless there is a specific reason.

**Accordion expand/collapse:**
```
duration: 280ms
easing: Easing.out(Easing.cubic)
height animates from 0 to measured content height
opacity fades in starting at 30% of the height animation progress
```

**Button press:**
```
transform: [{ scale: 0.97 }]
duration: instant (spring-based)
Use Animated.spring with speed: 30
```

**List item entrance (stagger):**
When a list of items loads, each item fades in and slides up with a slight stagger delay.
```
per item:
  opacity: 0 -> 1
  translateY: 16-24px -> 0
  duration: 400-500ms
  delay: 60-80ms per item (index * 60)
  easing: Easing.out(Easing.cubic)
```

**Toast entrance:**
```
translateY: -100px -> 0 (slides down from above screen)
withSpring: damping: 20, stiffness: 200
```

**Modal/bottom sheet entrance:**
```
translateY: screenHeight -> 0
withSpring: damping: 25, stiffness: 180
backdrop opacity: 0 -> 1, duration: 250ms
```

### Loading State Animations

This is a signature differentiator. NO skeletons, NO generic spinners.

Each loading context gets a custom animation with friendly text:

**Search in progress (wizard -> results):**
- An SVG plane icon moves along a track line
- Route text: "Searching JFK -> LAX" (ExtraBold, 24px)
- Rotating friendly messages below: "Checking departure dates...", "Finding the best prices...", "Comparing airlines...", "Almost there..."
- Messages rotate every 4-5 seconds with a fade transition
- Subtle note: "This may take up to 2 minutes" (micro text, `color.neutral.400`)

**Home screen loading (initial load / refresh):**
- NOT a spinner. A brief, subtle pulse animation on the screen:
  - The greeting text appears immediately (no waiting for data)
  - Below it, a gentle pulsing line or dot animation while searches load
  - Friendly text: "Checking your flights..." in `type.secondary`, pulsing opacity
  - Once data arrives, searches stagger in with the list entrance animation

**Price check / refresh on detail screen:**
- A small inline animation near the price. The price text subtly pulses or the trend indicator shows a scanning state
- Text: "Checking latest prices..."

**Credits loading:**
- The balance number counts up from 0 to the actual value over ~600ms when the screen first loads. Use a number ticker animation.

### Animation Rules

**DO:**
- Use `useNativeDriver: true` whenever possible (opacity, transform, scale, rotation)
- Debounce or throttle animations triggered by rapid user input
- Cancel animations on component unmount (return cleanup from useEffect)
- Test animations at 60fps on a real device

**DON'T:**
- Don't animate layout properties (height, width, margin) with the native driver -- use Reanimated layout animations or Animated with `useNativeDriver: false` only when necessary
- Don't create looping ambient animations that run indefinitely when the screen is visible but not being interacted with (this drains battery)
- Don't animate more than 3-4 properties simultaneously on a single element
- Don't use LayoutAnimation for complex transitions -- it is unpredictable. Use explicit Animated/Reanimated values

---

## 10. Voice and Tone

### The Personality

Skylens speaks like a knowledgeable friend who is good at finding cheap flights. It is warm, direct, and confident. It respects the user's time.

### The Voice Rules

1. **Use "you" and "your" freely.** "Your flights," "your prices," "you've got 12 options." The user is always addressed directly.

2. **Use "we" for brand-level statements.** "We check every date so you don't have to." "We'll keep watching this one." The "we" is Skylens the product, and it is honest -- there IS a system working on the user's behalf.

3. **NEVER use "I."** The app is not a person. No "I found your flights." No "I'm searching." This breaks down when things go wrong and feels dishonest.

4. **Be brief.** If you can say it in 4 words, do not use 10. "3 prices dropped" not "We wanted to let you know that 3 of your saved searches have experienced price decreases."

5. **Lead with the useful information.** "JFK -> LAX dropped $45" not "We have an update about one of your searches: the JFK to LAX route that you've been tracking..."

6. **Be encouraging, not instructional.** "Let's find your first deal" not "To get started, create a new search by tapping the + button."

### Copy Examples

| Context                    | DO                                              | DON'T                                                |
|----------------------------|--------------------------------------------------|------------------------------------------------------|
| Empty home screen          | "Nothing to report yet"                          | "You have no saved searches. Create one to begin."   |
| Empty home subtitle        | "Tap + to start tracking a flight"               | "Use the add button below to create your first saved search" |
| Price drop                 | "Down $45 since tracking started"                | "Price decrease detected: -$45.00"                   |
| Price stable               | "Prices holding steady"                          | "No price changes have been detected"                |
| Search in progress         | "Checking departure dates..."                    | "Loading search results, please wait..."             |
| Search complete            | "12 flights found for you"                       | "Search complete. 12 results returned."              |
| No results                 | "No flights found for those dates"               | "Your search returned 0 results. Try adjusting your parameters." |
| Error                      | "Something went wrong. Pull down to try again."  | "Error 500: Internal Server Error"                   |
| Tracking active            | "Prices are being watched"                       | "Price tracking is currently active for this search" |
| Wizard: origin             | "Where are you flying from?"                     | "Select departure airport"                           |
| Wizard: destination        | "Where to?"                                      | "Select arrival airport"                             |
| Wizard: dates              | "When do you want to go?"                        | "Choose travel dates"                                |
| Wizard: nights             | "How long do you want to stay?"                  | "Select trip duration (nights)"                      |
| Credits balance            | "247 credits available"                          | "Your current credit balance: 247"                   |
| Credits empty              | "You're out of credits"                          | "Insufficient credit balance (0)"                    |

### Tone Modulation

The tone shifts slightly based on context:

- **Home screen / briefing:** Casual and warm. Like a friend greeting you.
- **Search results:** Factual and efficient. The data speaks for itself.
- **Errors:** Empathetic and helpful. Never blame the user.
- **Wizard:** Conversational and guiding. One question at a time.
- **Credits / purchases:** Clear and honest. No manipulative urgency.
- **Price drops:** Quietly excited. "Down $45" with a green indicator is enough -- do not add exclamation marks or celebrate excessively.

---

## 11. Loading and Empty States

### Loading States

Every loading context gets a custom treatment. The pattern is always: **animation + friendly text**.

**Full-screen loading (search in progress):**
```
Layout:
  - Centered vertically
  - SVG animation at top (plane on track, or pulsing dots, or route visualization animating)
  - Route text below: "Searching [ORIGIN] -> [DESTINATION]"
  - Rotating message below that (fades between messages every 4-5s)
  - Subtle timing note at bottom

Animation implementation:
  - Use React Native Animated or Reanimated
  - The animated element should move or transform continuously
  - Messages crossfade: current message fades out (200ms), new message fades in (300ms)
```

**Inline loading (refreshing data, checking prices):**
```
- A pulsing opacity animation on the relevant text/element
- Animated.loop of opacity 1 -> 0.35 -> 1, duration ~2000ms, Easing.inOut
- Friendly text in place of the data: "Checking..." or "Updating..."
```

**Transition loading (navigating to a screen that needs data):**
```
- The screen structure renders immediately (header, layout)
- Content area shows a brief animated state (pulsing dots or a subtle shimmer using Animated translateX)
- Data stagger-fades in when ready
- Total loading feel should be under 500ms for cached data
```

**Number ticker (credits balance, price updates):**
```
- When a number value loads or changes, it counts to the target value over ~600ms
- Use Reanimated's useSharedValue + useDerivedValue to interpolate
- The counting makes the number feel alive and earned, not just stamped on screen
```

### Empty States

Empty states are context-dependent and use a mix of approaches:

**Pattern A: Typographic (for simple contexts)**
```
- Title: type.heading2, centered, color.neutral.900
- Subtitle: type.secondary, centered, color.neutral.500, max 2 lines
- No illustration, no icon
- Action comes from elsewhere (nav bar plus button, or a single text link)

Example:
  "Nothing to report yet"
  "Tap + to start tracking a flight"
```

**Pattern B: Icon + typographic (for primary contexts)**
```
- A single subtle icon: 40-48px, color.primary.300 or color.neutral.300
- Use a relevant Lucide icon (e.g., Search for no results, Plane for no searches)
- Title + subtitle below, same style as Pattern A
- Optionally a single primary button below if the action is not obvious from context

Example (no results):
  [Search icon, muted]
  "No flights found for those dates"
  "Try widening your date range"
```

**Pattern C: Abstract geometric (for special contexts)**
```
- A small arrangement of abstract shapes: circles, lines, dots
- Built with View components (no images), using color.primary.200 and color.neutral.200
- Subtle, not attention-grabbing -- a visual anchor, not an illustration
- Title + subtitle below

Use for: onboarding moments, first-time screens, celebration states (first search completed)
```

### Rules for Loading and Empty States

**DO:**
- Always show the page structure (header, nav bar) immediately, even while content is loading
- Use the exact friendly copy from the Voice and Tone section
- Make loading animations smooth and continuous -- no stuttering
- Make empty states feel intentional, not broken

**DON'T:**
- NEVER show a blank white/blue screen while loading
- NEVER use ActivityIndicator as the sole loading state for full screens
- NEVER use skeleton screens (gray placeholder rectangles)
- NEVER show an empty state that does not tell the user what to do next
- NEVER use error codes or technical language in user-facing messages

---

## 12. Accessibility

### Color Contrast

- All text on the mesh gradient background must meet **WCAG AA** minimum contrast ratio:
  - Normal text (under 18px): 4.5:1 minimum
  - Large text (18px+ bold or 24px+ regular): 3:1 minimum
- `color.neutral.900` (#0F172A) on the lightest mesh background (#FAFCFF): ~18:1 ratio (passes AAA)
- `color.neutral.500` (#64748B) on the lightest mesh background: ~4.6:1 ratio (passes AA for normal text)
- `color.neutral.400` (#94A3B8) on the lightest mesh background: ~3.2:1 ratio (passes AA ONLY for large text -- use at 14px+ with medium weight or heavier)
- `color.primary.500` (#2F9CF4) on white: ~3.2:1 (use at 14px+ only, or pair with `color.primary.700` for small text)

### Focus and Interaction

- All interactive elements must have a visible pressed/active state
- Touch targets: minimum 44x44pt
- Interactive elements must be reachable with one hand in portrait orientation (bottom nav helps with this)
- Tappable rows must have the entire row as the touch target, not just the text within it

### Screen Reader Support

- All images and icons must have `accessibilityLabel` props
- Custom buttons built from Pressable must have `accessibilityRole="button"`
- Decorative elements (background gradients, animated ambient elements) must have `accessibilityElementsHidden={true}` or `importantForAccessibility="no"`
- Navigation actions must be labeled: "Go back," "Open search," "View credits"

### Motion Sensitivity

- Respect the system's `reduceMotion` accessibility setting
- When reduce motion is enabled:
  - Disable all looping ambient animations
  - Replace slide/spring transitions with instant opacity fades
  - Skip the stagger delay on list entrance (show all items at once)
  - Keep the loading state text cycling but disable the animated plane/icon

Implementation:
```typescript
import { AccessibilityInfo } from 'react-native';

// Check once on mount
const [reduceMotion, setReduceMotion] = useState(false);
useEffect(() => {
  AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
  return () => sub.remove();
}, []);
```

### Text Scaling

- Do NOT set `allowFontScaling={false}` on body text. Users who need larger text must be able to scale it.
- `allowFontScaling={false}` is acceptable ONLY for:
  - The hero price display (it would break layout at 2x scale)
  - The bottom nav bar icons (they are fixed-size)
  - Tiny status pills where layout is extremely constrained
- All other text must support the system font scale

---

## Quick Reference: Token Summary

### Colors (copy-paste ready)

```typescript
export const colors = {
  primary: {
    50:  '#F0F8FF',
    100: '#E0F2FE',
    200: '#BAE1FC',
    300: '#8FD0FA',
    400: '#5CB8F7',
    500: '#2F9CF4',  // primary action color
    600: '#1A7ED4',  // pressed state
    700: '#1466B0',  // high-contrast blue text
  },
  warm: {
    100: '#FEF3C7',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',  // warm accent
    600: '#D97706',
  },
  neutral: {
    50:  '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',  // primary text
  },
  success: {
    bg:  'rgba(34, 197, 94, 0.08)',
    100: '#DCFCE7',
    500: '#22C55E',
    600: '#16A34A',
  },
  warning: {
    100: '#FEF3C7',
    500: '#F59E0B',
    600: '#D97706',
  },
  error: {
    bg:  'rgba(239, 68, 68, 0.08)',
    100: '#FEE2E2',
    500: '#EF4444',
    600: '#DC2626',
  },
} as const;
```

### Spacing (copy-paste ready)

```typescript
export const space = {
  xs:  4,
  sm:  8,
  md:  12,
  base: 16,
  lg:  20,
  xl:  24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
} as const;
```

### Border Radii

```typescript
export const radii = {
  sm:    8,   // small pills, compact badges
  md:    12,  // buttons, inputs, standard elements
  lg:    16,  // toasts, modal tops, larger elements
  xl:    20,  // bottom sheet top corners, large panels
  full:  9999, // circles (nav button, coin icon)
} as const;
```

---

## Implementation Notes

### File Organization

When building new components, follow the existing pattern:
- Components: `/frontend/src/components/`
- Screens: `/frontend/app/`
- Utilities: `/frontend/src/utils/`
- Use the `fonts` utility from `/frontend/src/utils/fonts.ts` for all fontFamily references
- Use `StyleSheet.create()` for all styles -- no inline style objects except for animated values

### New Color System Migration

The primary blue is shifting from `#3B82F6` to `#2F9CF4`. When building new screens, use the new primary. Existing screens will be migrated incrementally. Do not mix old and new primaries on the same screen.

### Bottom Nav Integration

The bottom nav bar should be implemented as a custom tab bar component for Expo Router. It persists across all main app screens (home, credits, profile/settings). It is NOT shown on:
- Auth screens (welcome, login, register)
- The search wizard (add-search)
- Modal overlays

### Asset Management

- No image assets for UI elements (icons, illustrations, decorations). Everything is built with Views, SVG, and Lucide icons.
- The only image assets allowed are: the app icon/logo, airline logos (loaded from URLs), and user avatars (future).
- The Skylens logo/icon (used on auth screens) is an existing asset and should not be replaced without a deliberate rebrand effort.
