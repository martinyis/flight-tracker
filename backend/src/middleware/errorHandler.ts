import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";
import logger from "../config/logger";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // AppError hierarchy — structured response
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message, ...err.data });
    return;
  }

  // Prisma record-not-found (P2025)
  if (err.name === "PrismaClientKnownRequestError" && (err as any).code === "P2025") {
    res.status(404).json({ error: "Record not found" });
    return;
  }

  // Unknown / unhandled errors
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
}
