# Apple In-App Purchases Implementation Guide

## Overview

Replace simulated credit pack purchases with real Apple IAP using `react-native-iap`. Credits are granted only after server-side receipt validation via Apple's App Store Server API v2.

## Library

```
npx expo install react-native-iap
```

Requires a **development build** (no Expo Go) since it uses native modules.

## Architecture

```
User taps "Buy" -> react-native-iap -> Apple processes payment
                                            |
                                  App receives receipt
                                            |
                              Send receipt to backend
                                            |
                      Backend validates with Apple's Server API v2
                                            |
                  Backend credits user's balance (serializable txn)
                                            |
                      Backend responds -> App calls finishTransaction()
```

Credits are only granted after **server-side receipt validation**. Never trust the client.

---

## Prerequisites

- Apple Developer Account ($99/year)
- Bundle ID confirmed in `app.json` / `app.config.ts`
- 4 credit pack SKUs and prices confirmed

### Credit Packs

| Product ID | Name | Credits | Price |
|---|---|---|---|
| `credits_starter_50` | Starter | 50 | $4.99 |
| `credits_standard_150` | Standard | 150 | $12.99 |
| `credits_pro_400` | Pro | 400 | $29.99 |
| `credits_power_1000` | Power | 1000 | $59.99 |

---

## Phase 1: Apple Developer Portal Setup (Manual)

### 1A. Register App ID

1. Go to [developer.apple.com/account](https://developer.apple.com/account)
2. Certificates, Identifiers & Profiles -> Identifiers -> **+**
3. Select "App IDs" -> "App"
4. Enter Bundle ID (e.g. `com.yourname.skylens`)
5. Under Capabilities, check **In-App Purchase** (on by default)
6. Register

### 1B. Create App in App Store Connect

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. My Apps -> **+** -> New App
3. Fill in: name, Bundle ID (select from dropdown), SKU (e.g. `skylens`)
4. Save

### 1C. Create IAP Products

1. In your app -> **Monetization** -> **In-App Purchases** -> **+**
2. For each pack:
   - Type: **Consumable**
   - Reference Name, Product ID, Price (see table above)
3. For each product: add display name, description, and a screenshot (640x920 PNG placeholder is fine during development)
4. Set availability to target countries
5. Save — they'll be in "Ready to Submit" state

### 1D. Create Sandbox Tester(s)

1. App Store Connect -> Users and Access -> **Sandbox** (left sidebar)
2. **+** -> Create a test account
3. Use a real email you control (Apple sends verification)
4. Set any password, remember it
5. Create multiple testers if needed

### 1E. Generate App Store Server API Key (for backend validation)

1. App Store Connect -> Users and Access -> **Integrations** -> **In-App Purchase**
2. **Generate In-App Purchase Key**
3. Download the `.p8` file — **save securely, one-time download only**
4. Note down: **Key ID** and **Issuer ID**
5. These 3 things (Key ID, Issuer ID, `.p8` file) are needed for backend config

---

## Phase 2: StoreKit Local Testing (Xcode)

Lets you test purchases in Simulator without Apple accounts.

### 2A. Generate Xcode Project

```bash
cd frontend
npx expo prebuild --platform ios
```

### 2B. Create StoreKit Configuration

1. Open `ios/SkyLens.xcworkspace` in Xcode
2. File -> New -> File -> search **"StoreKit Configuration File"**
3. Name it `Products.storekit`, save in the `ios/` folder
4. **Uncheck** "Sync this file with an app in App Store Connect"
5. Click **+** -> **Add Consumable In-App Purchase**
6. Create all 4 products:
   - Reference Name: e.g. `Starter 50 Credits`
   - Product ID: `credits_starter_50`
   - Price: `4.99`
   - Localization: add English display name + description
7. Repeat for the other 3

### 2C. Enable StoreKit Config in Scheme

1. Xcode: Product -> Scheme -> Edit Scheme
2. Select **Run** -> **Options** tab
3. Set **StoreKit Configuration** to `Products.storekit`
4. Close

### 2D. Run

```bash
cd frontend
npx expo run:ios
```

Purchases work in Simulator with instant fake transactions. No Apple ID needed.

---

## Phase 3: Code Changes

### Backend

**New endpoint: `POST /api/credits/verify-purchase`**
- Receives Apple receipt/transaction from client
- Validates via App Store Server API v2 (JWT-based, uses `.p8` key)
- On success: credits user balance in serializable transaction
- Stores `appleTransactionId` for dedup (prevents double-crediting)
- On failure: returns error, no credits granted

**Prisma schema changes:**
- Add `appleTransactionId String?` to `CreditTransaction`
- Add `appleProductId String?` to `CreditTransaction`

**New environment variables:**
```env
APPLE_KEY_ID=your_key_id
APPLE_ISSUER_ID=your_issuer_id
APPLE_PRIVATE_KEY_PATH=./keys/AuthKey_XXXXX.p8
APPLE_BUNDLE_ID=com.martinyis.skylens
APPLE_ENVIRONMENT=sandbox  # switch to "production" after App Store approval
```

**Files to create/modify:**
- `src/services/appleIapService.ts` — receipt validation logic
- `src/controllers/creditsController.ts` — add `verifyPurchase` handler
- `src/routes/credits.ts` — add POST route
- `prisma/schema.prisma` — add fields to CreditTransaction

### Frontend

**`app/credits.tsx` changes:**
- Import and initialize `react-native-iap`
- `initConnection()` on mount, `endConnection()` on unmount
- `getProducts(skus)` to fetch real prices from Apple (handles currency localization)
- Replace simulated purchase with `requestPurchase(sku)`
- Listen to `purchaseUpdatedListener`:
  1. Send receipt to `POST /api/credits/verify-purchase`
  2. On backend success: refresh credit balance
  3. Call `finishTransaction(purchase)` — **critical, or Apple keeps re-delivering**
- Handle `purchaseErrorListener` for failures/cancellations

**Product ID mapping:**
```typescript
const PRODUCT_SKUS = [
  'credits_starter_50',
  'credits_standard_150',
  'credits_pro_400',
  'credits_power_1000',
];

const CREDITS_MAP: Record<string, number> = {
  credits_starter_50: 50,
  credits_standard_150: 150,
  credits_pro_400: 400,
  credits_power_1000: 1000,
};
```

---

## Phase 4: Testing Progression

### 1. Local (StoreKit in Simulator)

- Full flow with instant fake transactions
- Verify credits appear in backend DB
- Test error cases (cancel purchase, network failure)

### 2. Sandbox (Physical Device)

1. On iPhone: Settings -> App Store -> sign out of real Apple ID
2. Open app, tap Buy -> sign in with **Sandbox tester** account
3. Purchases are free, behave like real ones
4. Verify backend receipt validation works

### 3. TestFlight

```bash
eas build --platform ios --profile preview
```

- Upload to App Store Connect (EAS does this automatically)
- App Store Connect -> TestFlight -> add testers
- Testers use Sandbox purchasing automatically

---

## Phase 5: Production Deployment

### 5A. Prepare Submission

In App Store Connect, fill out:
- Privacy policy URL (required)
- App category
- Age rating
- Screenshots for each device size (6.7", 6.5", 5.5" minimum)
- App description, keywords, support URL
- All 4 IAP products in **"Ready to Submit"** state

### 5B. Build

```bash
eas build --platform ios --profile production
```

### 5C. Submit

```bash
eas submit --platform ios
```

Or manually upload the `.ipa` from EAS dashboard.

### 5D. App Review

- In App Store Connect -> App Review section
- Add review notes: explain IAP testing (provide test account if needed)
- Submit for review
- Typical review time: **24-48 hours**
- Common rejection reasons:
  - Missing "Restore Purchases" button (not strictly needed for consumables but some reviewers ask)
  - IAP descriptions don't match app UI
  - Missing privacy policy

### 5E. Go Live

1. Apple approves -> choose "Release immediately" or specific date
2. Switch backend `APPLE_ENVIRONMENT` from `sandbox` to `production`
3. The `.p8` key works for both environments

---

## Pricing & Apple's Cut

Apple takes **30%** (15% if under $1M/year via [Small Business Program](https://developer.apple.com/programs/small-business)).

| Pack | User Pays | Apple 30% | You Get | SerpAPI Cost (est.) | Profit |
|---|---|---|---|---|---|
| Starter 50 | $4.99 | $1.50 | $3.49 | ~$1.67 | ~$1.82 |
| Standard 150 | $12.99 | $3.90 | $9.09 | ~$5.00 | ~$4.09 |
| Pro 400 | $29.99 | $9.00 | $20.99 | ~$13.33 | ~$7.66 |
| Power 1000 | $59.99 | $18.00 | $41.99 | ~$33.33 | ~$8.66 |

50% margin shrinks to ~20-35% with Apple's cut. Consider:
- Applying for Small Business Program (15% cut)
- Adjusting prices upward to maintain margin

---

## Key Gotchas

- **Must call `finishTransaction()`** after processing or Apple re-delivers the purchase endlessly
- **Consumables can't be restored** — backend DB is source of truth for credit balance
- **Apple requires IAP** for digital goods/services (can't use Stripe for credits on iOS)
- **Use App Store Server API v2** (JWT-based) — legacy `verifyReceipt` endpoint is deprecated
- **Sandbox behaves differently**: transactions sometimes get stuck, password prompts appear repeatedly — this is normal sandbox behavior
