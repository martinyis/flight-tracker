import crypto from "crypto";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import appleSignin from "apple-signin-auth";
import prisma from "../config/db";
import { User } from "../generated/prisma/client";
import { grantSignupBonus } from "./creditService";
import { UnauthorizedError } from "../errors/AppError";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const ACCESS_TOKEN_EXPIRY = "1h";
const REFRESH_TOKEN_EXPIRY_DAYS = 90;
const REFRESH_TOKEN_BYTES = 48;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not defined");
  return secret;
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, getJwtSecret(), { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function verifyToken(token: string): { userId: string } {
  return jwt.verify(token, getJwtSecret()) as { userId: string };
}

// ── Refresh token helpers ─────────────────────────────────────────────────

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateRawRefreshToken(): string {
  return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString("base64url");
}

function refreshTokenExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
  return d;
}

export async function createRefreshToken(
  userId: number,
  familyId?: string
): Promise<string> {
  const rawToken = generateRawRefreshToken();
  const tokenHash = hashToken(rawToken);

  await prisma.refreshToken.create({
    data: {
      tokenHash,
      userId,
      familyId: familyId ?? crypto.randomUUID(),
      expiresAt: refreshTokenExpiresAt(),
    },
  });

  return rawToken;
}

export async function rotateRefreshToken(rawToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  return prisma.$transaction(async (tx) => {
    const tokenHash = hashToken(rawToken);

    const existing = await tx.refreshToken.findFirst({
      where: { tokenHash },
    });

    if (!existing) {
      throw new UnauthorizedError("Invalid refresh token");
    }

    if (existing.expiresAt < new Date()) {
      await tx.refreshToken.update({
        where: { id: existing.id },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedError("Refresh token expired");
    }

    // Reuse detection: token already revoked or already replaced
    if (existing.revokedAt || existing.replacedById) {
      await tx.refreshToken.updateMany({
        where: { familyId: existing.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedError("Refresh token reuse detected");
    }

    // Create new token in same family
    const newRawToken = generateRawRefreshToken();
    const newRecord = await tx.refreshToken.create({
      data: {
        tokenHash: hashToken(newRawToken),
        userId: existing.userId,
        familyId: existing.familyId,
        expiresAt: refreshTokenExpiresAt(),
      },
    });

    // Link old → new
    await tx.refreshToken.update({
      where: { id: existing.id },
      data: { replacedById: newRecord.id },
    });

    const accessToken = generateToken(String(existing.userId));
    return { accessToken, refreshToken: newRawToken };
  }, { isolationLevel: "Serializable" });
}

export async function revokeAllUserTokens(userId: number): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeTokenByRaw(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function cleanupExpiredTokens(): Promise<number> {
  const result = await prisma.refreshToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { revokedAt: { not: null } },
      ],
    },
  });
  return result.count;
}

// ── Social auth ───────────────────────────────────────────────────────────

interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
  isNewUser: boolean;
}

export async function appleAuth(identityToken: string): Promise<AuthResult> {
  const payload = await appleSignin.verifyIdToken(identityToken, {
    audience: process.env.APPLE_BUNDLE_ID!,
    ignoreExpiration: false,
  });

  if (!payload || !payload.sub) {
    throw new UnauthorizedError("Invalid Apple token");
  }

  const appleId = payload.sub;
  const email = payload.email
    ? payload.email.toLowerCase().trim()
    : null;

  let isNewUser = false;

  // Case 1: user already linked by appleId
  let user = await prisma.user.findUnique({ where: { appleId } });

  if (!user) {
    // Case 2: user exists by email but not yet linked
    if (email) {
      user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { appleId },
        });
      }
    }

    // Case 3: brand new user
    if (!user) {
      user = await prisma.user.create({
        data: { email: email ?? `apple_${appleId}@privaterelay.appleid.com`, appleId },
      });
      await grantSignupBonus(user.id);
      isNewUser = true;
    }
  }

  const accessToken = generateToken(String(user.id));
  const refreshToken = await createRefreshToken(user.id);
  return { user, accessToken, refreshToken, isNewUser };
}

export async function googleAuth(idToken: string): Promise<AuthResult> {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: [
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_IOS_CLIENT_ID!,
      process.env.GOOGLE_ANDROID_CLIENT_ID!,
    ].filter(Boolean),
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw new UnauthorizedError("Invalid Google token");
  }

  const { sub: googleId, email: rawEmail } = payload;
  const email = rawEmail!.toLowerCase().trim();

  let isNewUser = false;

  // Case 1: user already linked by googleId
  let user = await prisma.user.findUnique({ where: { googleId } });

  if (!user) {
    // Case 2: user exists by email but not yet linked
    user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId },
      });
    } else {
      // Case 3: brand new user
      user = await prisma.user.create({
        data: { email, googleId },
      });
      await grantSignupBonus(user.id);
      isNewUser = true;
    }
  }

  const accessToken = generateToken(String(user.id));
  const refreshToken = await createRefreshToken(user.id);
  return { user, accessToken, refreshToken, isNewUser };
}
