import rateLimit from "express-rate-limit";
import { AuthRequest } from "./auth";

// NOTE: If you put this behind a reverse proxy (nginx, load balancer),
// set app.set('trust proxy', 1) in index.ts so req.ip reflects the real client IP.

/** Global limiter — applied to all routes except /health. Keyed by IP. */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: "Too many requests, please try again later" });
  },
});

/** Auth limiter — applied to login routes. Keyed by IP. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: "Too many login attempts, please try again later" });
  },
});

/** SerpAPI limiter — applied to search routes that call SerpAPI. Keyed by userId. */
export const serpApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req as AuthRequest).userId || "unknown",
  handler: (_req, res) => {
    res.status(429).json({ error: "Too many search requests, please try again later" });
  },
});
