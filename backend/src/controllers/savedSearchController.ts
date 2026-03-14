import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import * as savedSearchService from "../services/savedSearchService";
import { fetchBookingUrl } from "../services/flightService";

export const createSearch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { search, creditsCharged, remainingBalance, resultsError } =
    await savedSearchService.createSavedSearch(req.userId!, req.body);
  res.status(201).json({ search, creditsCharged, remainingBalance, resultsError });
});

export const getSearches = asyncHandler(async (req: AuthRequest, res: Response) => {
  const searches = await savedSearchService.getUserSearches(req.userId!);
  res.json(searches);
});

export const getSearch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const search = await savedSearchService.getSearchById(req.params.id as string, req.userId!);
  res.json(search);
});

export const deleteSearch = asyncHandler(async (req: AuthRequest, res: Response) => {
  await savedSearchService.deleteSearch(req.params.id as string, req.userId!);
  res.json({ message: "Deleted" });
});

export const refreshSearch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const search = await savedSearchService.refreshSearch(
    req.params.id as string,
    req.userId!,
    req.body.resetFilter
  );
  res.json(search);
});

export const paidRefresh = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await savedSearchService.paidRefresh(
    req.params.id as string,
    req.userId!,
    req.body.apiFilters
  );
  res.json(result);
});

export const updateFilters = asyncHandler(async (req: AuthRequest, res: Response) => {
  const search = await savedSearchService.updateFilters(
    req.params.id as string,
    req.userId!,
    req.body.filters ?? {}
  );
  res.json(search);
});

export const toggleSearch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const search = await savedSearchService.toggleSearchActive(req.params.id as string, req.userId!);
  res.json(search);
});

export const hydrateSearch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const search = await savedSearchService.hydrateSearch(req.params.id as string, req.userId!);
  res.json(search);
});

export const getBookingUrl = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { departure_token, booking_token, origin, destination, date, returnDate } = req.body;
  const url = await fetchBookingUrl({
    departure_token,
    booking_token,
    origin,
    destination,
    date,
    returnDate,
  });
  res.json({ url });
});

export const activateTracking = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await savedSearchService.activateTracking(
    req.params.id as string,
    req.userId!,
    req.body.trackingDays
  );
  res.json(result);
});

export const reSearch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await savedSearchService.reSearchExcludingAirlines(
    req.params.id as string,
    req.userId!,
    req.body.excludeAirlines
  );
  res.status(201).json(result);
});

export const hydrateOne = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await savedSearchService.hydrateOneOption(
    req.params.id as string,
    req.userId!,
    req.body.optionIndex
  );
  res.json(result);
});
