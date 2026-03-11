export type TripType = "roundtrip" | "oneway";

export type WizardStep = "form" | "searching";

/** Represents a selected airport (IATA code + display info) */
export interface AirportSelection {
  /** 3-letter IATA code, e.g. "JFK" */
  iata: string;
  /** City name for display, e.g. "New York" */
  city: string;
}

export interface ApiFiltersForm {
  stops?: 1 | 2;        // 1=Nonstop, 2=1 stop or fewer (omit=any)
  airlineMode?: "include" | "exclude";
  airlines?: string;    // comma-separated IATA codes
  maxDuration?: number; // minutes
  bags?: boolean;       // true = carry-on included
}

export interface WizardFormData {
  tripType: TripType;
  origin: AirportSelection | null;
  destination: AirportSelection | null;
  dateFrom: Date;
  dateTo: Date;
  minNights: string;
  maxNights: string;
  apiFilters: ApiFiltersForm;
}

export interface SearchResult {
  id: number;
  resultsError?: string;
}
