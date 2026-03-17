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

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(",")
        : "http://localhost:8081",
    })
  );
  app.use(express.json());

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
  app.listen(PORT, () => {
    logger.info({ port: PORT }, "Server started");
    startPriceCheckCron();
  });
}
