export type TripType = "roundtrip" | "oneway";

export type WizardStep = "form" | "searching";

/** Represents a selected airport (IATA code + display info) */
export interface AirportSelection {
  /** 3-letter IATA code, e.g. "JFK" */
  iata: string;
  /** City name for display, e.g. "New York" */
  city: string;
}

export interface WizardFormData {
  tripType: TripType;
  origin: AirportSelection | null;
  destination: AirportSelection | null;
  dateFrom: Date;
  dateTo: Date;
  minNights: string;
  maxNights: string;
}

export interface SearchResult {
  id: number;
  resultsError?: string;
}
