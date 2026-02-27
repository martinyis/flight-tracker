import { Alert, IAlert } from "../models/Alert";

export async function getAllAlerts(): Promise<IAlert[]> {
  return Alert.find().sort({ createdAt: -1 });
}

export async function createAlert(
  data: Partial<IAlert>
): Promise<IAlert> {
  return Alert.create(data);
}

export async function deleteAlert(id: string): Promise<IAlert | null> {
  return Alert.findByIdAndDelete(id);
}
