import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../config/db";
import { User } from "../generated/prisma/client";

const SALT_ROUNDS = 10;

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
