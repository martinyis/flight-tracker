import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import appleSignin from "apple-signin-auth";
import prisma from "../config/db";
import { User } from "../generated/prisma/client";
import { grantSignupBonus } from "./creditService";
import { UnauthorizedError } from "../errors/AppError";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not defined");
  return secret;
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, getJwtSecret(), { expiresIn: "7d" });
}

export function verifyToken(token: string): { userId: string } {
  return jwt.verify(token, getJwtSecret()) as { userId: string };
}

export async function appleAuth(
  identityToken: string
): Promise<{ user: User; token: string }> {
  const payload = await appleSignin.verifyIdToken(identityToken, {
    audience: "com.martinyis.flighttracker",
    ignoreExpiration: false,
  });

  if (!payload || !payload.sub) {
    throw new UnauthorizedError("Invalid Apple token");
  }

  const appleId = payload.sub;
  const email = payload.email
    ? payload.email.toLowerCase().trim()
    : null;

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
    }
  }

  const token = generateToken(String(user.id));
  return { user, token };
}

export async function googleAuth(
  idToken: string
): Promise<{ user: User; token: string }> {
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
    }
  }

  const token = generateToken(String(user.id));
  return { user, token };
}
