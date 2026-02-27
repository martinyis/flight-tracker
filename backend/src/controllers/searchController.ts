import { Request, Response, NextFunction } from "express";
import { findCheapestCombos, SearchParams } from "../services/flightService";

export async function search(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { origin, destination, dateFrom, dateTo, minNights, maxNights } =
      req.body as SearchParams;

    if (!origin || !destination || !dateFrom || !dateTo || minNights == null || maxNights == null) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const combos = await findCheapestCombos({
      origin: origin.toUpperCase(),
      destination: destination.toUpperCase(),
      dateFrom,
      dateTo,
      minNights: Number(minNights),
      maxNights: Number(maxNights),
    });

    res.json({ results: combos });
  } catch (err) {
    next(err);
  }
}
