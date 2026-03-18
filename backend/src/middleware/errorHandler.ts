import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";
import logger from "../config/logger";

/** Strip sensitive fields from request body before logging */
function sanitizeBody(body: any): any {
  if (!body || typeof body !== "object") return body;
  const sanitized = { ...body };
  for (const key of ["identityToken", "idToken", "refreshToken", "password", "token"]) {
    if (key in sanitized) sanitized[key] = "[REDACTED]";
  }
  return sanitized;
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const context = {
    method: req.method,
    url: req.originalUrl,
    userId: (req as any).userId ?? null,
    reqId: (req as any).id ?? null,
  };

  // AppError hierarchy — structured response + warn log
  if (err instanceof AppError) {
    logger.warn(
      { ...context, statusCode: err.statusCode, errorData: err.data },
      `${err.statusCode} ${err.message}`
    );
    res.status(err.statusCode).json({ error: err.message, ...err.data });
    return;
  }

  // Prisma record-not-found (P2025)
  if (err.name === "PrismaClientKnownRequestError" && (err as any).code === "P2025") {
    logger.warn({ ...context, prismaCode: "P2025" }, "Record not found");
    res.status(404).json({ error: "Record not found" });
    return;
  }

  // Unknown / unhandled errors — full details
  logger.error(
    { ...context, err, body: sanitizeBody(req.body) },
    "Unhandled error"
  );
  res.status(500).json({ error: "Internal server error" });
}
