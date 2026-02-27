import { Request, Response, NextFunction } from "express";
import * as alertService from "../services/alertService";

export async function getAlerts(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const alerts = await alertService.getAllAlerts();
    res.json(alerts);
  } catch (err) {
    next(err);
  }
}

export async function createAlert(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const alert = await alertService.createAlert(req.body);
    res.status(201).json(alert);
  } catch (err) {
    next(err);
  }
}

export async function deleteAlert(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const alert = await alertService.deleteAlert(req.params.id);
    if (!alert) {
      res.status(404).json({ error: "Alert not found" });
      return;
    }
    res.json({ message: "Deleted" });
  } catch (err) {
    next(err);
  }
}
