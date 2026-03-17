import "dotenv/config";
import crypto from "crypto";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import logger from "./config/logger";
import { errorHandler } from "./middleware/errorHandler";
import { authenticate } from "./middleware/auth";
import authRoutes from "./routes/auth";
import searchRoutes from "./routes/search";
import creditsRoutes from "./routes/credits";
import { startPriceCheckCron } from "./workers/priceCheckWorker";
import { globalLimiter } from "./middleware/rateLimiter";

// Fail fast if critical env vars are missing
const REQUIRED_ENV = [
  "DATABASE_URL",
  "JWT_SECRET",
  "SERPAPI_KEY",
  "GOOGLE_CLIENT_ID",
  "APPLE_BUNDLE_ID",
] as const;

if (process.env.NODE_ENV !== "test") {
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    logger.fatal({ missing }, "Missing required environment variables");
    process.exit(1);
  }
}

export function createApp() {
  const app = express();

  // Required for correct client IP behind reverse proxy (Railway, ALB, nginx, etc.)
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(",")
        : "http://localhost:8081",
    })
  );
  app.use(express.json({ limit: "100kb" }));

  if (process.env.NODE_ENV !== "test") {
    app.use(
      pinoHttp({
        logger,
        genReqId: (req) =>
          (req.headers["x-request-id"] as string) ?? crypto.randomUUID(),
        autoLogging: {
          ignore: (req) => req.url === "/health",
        },
        customLogLevel: (_req, res) => {
          if (res.statusCode >= 500) return "error";
          if (res.statusCode >= 400) return "warn";
          return "info";
        },
        serializers: {
          req: (req) => ({
            method: req.method,
            url: req.url,
          }),
          res: (res) => ({
            statusCode: res.statusCode,
          }),
        },
      })
    );

    app.use(globalLimiter);
  }

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/search", authenticate, searchRoutes);
  app.use("/api/credits", authenticate, creditsRoutes);

  app.use(errorHandler);

  return app;
}

if (require.main === module) {
  const app = createApp();
  const PORT = process.env.PORT || 3000;
  const server = app.listen(PORT, () => {
    logger.info({ port: PORT }, "Server started");
    startPriceCheckCron();
  });

  // Graceful shutdown for container orchestration (ECS, Kubernetes)
  const shutdown = (signal: string) => {
    logger.info({ signal }, "Received shutdown signal, closing server…");
    server.close(async () => {
      const { default: prisma } = await import("./config/db");
      await prisma.$disconnect();
      logger.info("Graceful shutdown complete");
      process.exit(0);
    });
    // Force exit after 10s if connections linger
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
