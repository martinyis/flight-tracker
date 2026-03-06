import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import appleSignin from "apple-signin-auth";
import prisma from "../config/db";
import { User } from "../generated/prisma/client";

const SALT_ROUNDS = 10;
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

export async function registerUser(
  email: string,
  password: string
): Promise<{ user: User; token: string }> {
  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });
  if (existing) {
    const error = new Error("Email already registered") as Error & {
      statusCode?: number;
    };
    error.statusCode = 409;
    throw error;
  }

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase().trim(),
      password: hash,
    },
  });
  const token = generateToken(String(user.id));
  return { user, token };
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ user: User; token: string }> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });
  if (!user) {
    const error = new Error("Invalid email or password") as Error & {
      statusCode?: number;
    };
    error.statusCode = 401;
    throw error;
  }

  if (!user.password) {
    const error = new Error(
      "This account uses Google Sign-In. Please sign in with Google."
    ) as Error & { statusCode?: number };
    error.statusCode = 401;
    throw error;
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    const error = new Error("Invalid email or password") as Error & {
      statusCode?: number;
    };
    error.statusCode = 401;
    throw error;
  }

  const token = generateToken(String(user.id));
  return { user, token };
}

export async function appleAuth(
  identityToken: string
): Promise<{ user: User; token: string }> {
  const payload = await appleSignin.verifyIdToken(identityToken, {
    audience: "com.martinyis.flighttracker",
    ignoreExpiration: false,
  });

  if (!payload || !payload.sub) {
    const error = new Error("Invalid Apple token") as Error & {
      statusCode?: number;
    };
    error.statusCode = 401;
    throw error;
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
    const error = new Error("Invalid Google token") as Error & {
      statusCode?: number;
    };
    error.statusCode = 401;
    throw error;
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
    }
  }

  const token = generateToken(String(user.id));
  return { user, token };
}
