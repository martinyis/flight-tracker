import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import * as authService from "../services/authService";
import prisma from "../config/db";
import { NotFoundError } from "../errors/AppError";

export const appleLogin = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { user, accessToken, refreshToken, isNewUser } = await authService.appleAuth(req.body.identityToken);
  res.json({
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, hasUsedFreeSearch: user.hasUsedFreeSearch },
    isNewUser,
  });
});

export const googleLogin = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { user, accessToken, refreshToken, isNewUser } = await authService.googleAuth(req.body.idToken);
  res.json({
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, hasUsedFreeSearch: user.hasUsedFreeSearch },
    isNewUser,
  });
});

export const refreshToken = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await authService.rotateRefreshToken(req.body.refreshToken);
  res.json({ accessToken: result.accessToken, refreshToken: result.refreshToken });
});

export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { refreshToken: rawToken } = req.body;
  if (rawToken) {
    await authService.revokeTokenByRaw(rawToken);
  }
  res.json({ message: "Logged out" });
});

export const getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = Number(req.userId);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      googleId: true,
      appleId: true,
      creditBalance: true,
      hasUsedFreeSearch: true,
      createdAt: true,
      _count: { select: { searches: true } },
    },
  });

  if (!user) throw new NotFoundError("User not found");

  const activeSearches = await prisma.savedSearch.count({
    where: { userId, active: true },
  });

  res.json({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    provider: user.appleId ? "apple" : user.googleId ? "google" : "unknown",
    creditBalance: user.creditBalance,
    hasUsedFreeSearch: user.hasUsedFreeSearch,
    createdAt: user.createdAt,
    totalSearches: user._count.searches,
    activeSearches,
  });
});

export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = Number(req.userId);
  const { firstName, lastName } = req.body;

  const data: Record<string, string | null> = {};
  if (firstName !== undefined) {
    data.firstName = typeof firstName === "string" ? firstName.trim() || null : null;
  }
  if (lastName !== undefined) {
    data.lastName = typeof lastName === "string" ? lastName.trim() || null : null;
  }

  const user = await prisma.user.update({
    where: { id: userId },
    select: { id: true, firstName: true, lastName: true },
    data,
  });

  res.json(user);
});

export const savePushToken = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = Number(req.userId);
  const { pushToken } = req.body;
  await prisma.user.update({
    where: { id: userId },
    data: { pushToken: pushToken || null },
  });
  res.json({ success: true });
});

export const deleteAccount = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = Number(req.userId);
  await authService.revokeAllUserTokens(userId);
  await prisma.user.delete({ where: { id: userId } });
  res.json({ message: "Account deleted" });
});
