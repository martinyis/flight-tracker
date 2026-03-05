import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import * as savedSearchService from "../services/savedSearchService";
import { fetchBookingUrl } from "../services/flightService";

export async function createSearch(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { search, resultsError } = await savedSearchService.createSavedSearch(
      req.userId!,
      req.body
    );
    res.status(201).json({ search, resultsError });
  } catch (err: any) {
    if (err.status === 400) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
}

export async function getSearches(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const searches = await savedSearchService.getUserSearches(req.userId!);
    res.json(searches);
  } catch (err) {
    next(err);
  }
}

export async function getSearch(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const search = await savedSearchService.getSearchById(
      req.params.id as string,
      req.userId!
    );
    if (!search) {
      res.status(404).json({ error: "Search not found" });
      return;
    }
    res.json(search);
  } catch (err) {
    next(err);
  }
}

export async function deleteSearch(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const search = await savedSearchService.deleteSearch(
      req.params.id as string,
      req.userId!
    );
    if (!search) {
      res.status(404).json({ error: "Search not found" });
      return;
    }
    res.json({ message: "Deleted" });
  } catch (err) {
    next(err);
  }
}

export async function refreshSearch(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const resetFilter = req.body.resetFilter === true;
    const search = await savedSearchService.refreshSearch(
      req.params.id as string,
      req.userId!,
      resetFilter
    );
    if (!search) {
      res.status(404).json({ error: "Search not found" });
      return;
    }
    res.json(search);
  } catch (err) {
    next(err);
  }
}

export async function updateFilters(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const search = await savedSearchService.updateFilters(
      req.params.id as string,
      req.userId!,
      req.body.filters ?? {}
    );
    if (!search) {
      res.status(404).json({ error: "Search not found" });
      return;
    }
    res.json(search);
  } catch (err: any) {
    if (err.status === 400) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
}

export async function toggleSearch(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const search = await savedSearchService.toggleSearchActive(
      req.params.id as string,
      req.userId!
    );
    if (!search) {
      res.status(404).json({ error: "Search not found" });
      return;
    }
    res.json(search);
  } catch (err: any) {
    if (err.status === 400) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
}

export async function getBookingUrl(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { departure_token, booking_token, origin, destination, date, returnDate } =
      req.body;
    if (!departure_token && !booking_token) {
      res.status(400).json({ error: "departure_token or booking_token is required" });
      return;
    }
    if (!origin || !destination || !date) {
      res.status(400).json({ error: "origin, destination, and date are required" });
      return;
    }
    const url = await fetchBookingUrl({
      departure_token,
      booking_token,
      origin,
      destination,
      date,
      returnDate,
    });
    res.json({ url });
  } catch (err) {
    next(err);
  }
}
