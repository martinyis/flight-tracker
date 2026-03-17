import fs from "fs";
import jwt from "jsonwebtoken";
import logger from "../config/logger";

// ── Configuration ─────────────────────────────────────────────────────────

const APPLE_KEY_ID = process.env.APPLE_KEY_ID!;
const APPLE_ISSUER_ID = process.env.APPLE_ISSUER_ID!;
const APPLE_BUNDLE_ID = process.env.APPLE_BUNDLE_ID!;
const APPLE_KEY_PATH = process.env.APPLE_KEY_PATH!;
const APPLE_ENVIRONMENT = process.env.APPLE_ENVIRONMENT ?? "Sandbox";

const APPLE_PRODUCTION_URL = "https://api.storekit.apple.com";
const APPLE_SANDBOX_URL = "https://api.storekit-sandbox.apple.com";

let cachedKey: string | null = null;

function getPrivateKey(): string {
  if (!cachedKey) {
    if (process.env.APPLE_PRIVATE_KEY_BASE64) {
      cachedKey = Buffer.from(process.env.APPLE_PRIVATE_KEY_BASE64, "base64").toString("utf8");
    } else {
      cachedKey = fs.readFileSync(APPLE_KEY_PATH, "utf8");
    }
  }
  return cachedKey;
}

// ── JWT Generation ────────────────────────────────────────────────────────

function generateAppleJWT(): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: APPLE_ISSUER_ID,
    iat: now,
    exp: now + 20 * 60,
    aud: "appstoreconnect-v1",
    bid: APPLE_BUNDLE_ID,
  };

  return jwt.sign(payload, getPrivateKey(), {
    algorithm: "ES256",
    header: { alg: "ES256", kid: APPLE_KEY_ID, typ: "JWT" },
  });
}

// ── Types ─────────────────────────────────────────────────────────────────

export interface AppleTransaction {
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  bundleId: string;
  purchaseDate: number;
  type: string;
  environment: string;
}

// ── Transaction Lookup ────────────────────────────────────────────────────

async function fetchTransaction(baseUrl: string, transactionId: string): Promise<Response> {
  const token = generateAppleJWT();
  const url = `${baseUrl}/inApps/v1/transactions/${transactionId}`;
  return fetch(url, { headers: { Authorization: `Bearer ${token}` } });
}

export async function getTransaction(transactionId: string): Promise<AppleTransaction> {
  // In production: try production API first, fall back to sandbox (for TestFlight users).
  // In sandbox/dev: hit sandbox directly.
  let response: Response;

  if (APPLE_ENVIRONMENT === "Production") {
    response = await fetchTransaction(APPLE_PRODUCTION_URL, transactionId);
    if (response.status === 404) {
      logger.info({ transactionId }, "Transaction not found in production, trying sandbox");
      response = await fetchTransaction(APPLE_SANDBOX_URL, transactionId);
    }
  } else {
    response = await fetchTransaction(APPLE_SANDBOX_URL, transactionId);
  }

  if (!response.ok) {
    const body = await response.text();
    logger.error({ status: response.status, body, transactionId }, "Apple API error");
    throw new Error(`Apple API returned ${response.status}: ${body}`);
  }

  const data = (await response.json()) as { signedTransactionInfo: string };
  return decodeSignedTransaction(data.signedTransactionInfo);
}

// ── JWS Decoding ──────────────────────────────────────────────────────────

function decodeSignedTransaction(signedPayload: string): AppleTransaction {
  const parts = signedPayload.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWS format from Apple");
  }
  const payload = JSON.parse(
    Buffer.from(parts[1], "base64url").toString("utf8")
  );
  return payload as AppleTransaction;
}

// ── Product ID to Credits ─────────────────────────────────────────────────

const PRODUCT_CREDITS: Record<string, number> = {
  credits_starter_50: 50,
  credits_standard_150: 150,
  credits_pro_400: 400,
  credits_power_1000: 1000,
};

export function creditsForProduct(productId: string): number | null {
  return PRODUCT_CREDITS[productId] ?? null;
}

// ── Validation ────────────────────────────────────────────────────────────

export function validateTransaction(tx: AppleTransaction): void {
  if (tx.bundleId !== APPLE_BUNDLE_ID) {
    throw new Error(`Bundle ID mismatch: expected ${APPLE_BUNDLE_ID}, got ${tx.bundleId}`);
  }
  if (!PRODUCT_CREDITS[tx.productId]) {
    throw new Error(`Unknown product ID: ${tx.productId}`);
  }
  if (tx.type !== "Consumable") {
    throw new Error(`Unexpected transaction type: ${tx.type}`);
  }
}
