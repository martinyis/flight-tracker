import { Request, Response, NextFunction } from "express";
import * as authService from "../services/authService";

export async function register(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }

    const { user, token } = await authService.registerUser(email, password);
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email },
    });
  } catch (err: any) {
    if (err.statusCode) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    next(err);
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const { user, token } = await authService.loginUser(email, password);
    res.json({
      token,
      user: { id: user.id, email: user.email },
    });
  } catch (err: any) {
    if (err.statusCode) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    next(err);
  }
}

export async function appleLogin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { identityToken } = req.body;

    if (!identityToken) {
      res.status(400).json({ error: "Apple identity token is required" });
      return;
    }

    const { user, token } = await authService.appleAuth(identityToken);
    res.json({
      token,
      user: { id: user.id, email: user.email },
    });
  } catch (err: any) {
    if (err.statusCode) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    next(err);
  }
}

export async function googleLogin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      res.status(400).json({ error: "Google ID token is required" });
      return;
    }

    const { user, token } = await authService.googleAuth(idToken);
    res.json({
      token,
      user: { id: user.id, email: user.email },
    });
  } catch (err: any) {
    if (err.statusCode) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    next(err);
  }
}
