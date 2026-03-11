import { SearchFilters, ApiFilters } from "../../types/search";

export interface SerpFlight {
  airline: string;
  airline_logo?: string;
  flight_number: string;
  departure_airport: { name: string; id: string; time: string };
  arrival_airport: { name: string; id: string; time: string };
  duration: number;
}

export interface FlightLeg {
  date: string;
  price: number;
  airline: string;
  airline_logo?: string;
  departure_time: string;
  arrival_time: string;
  duration: number;
  stops: number;
  flights: SerpFlight[];
  departure_token?: string;
  booking_token?: string;
}

export interface FlightCombo {
  outbound: FlightLeg;
  return: FlightLeg;
  totalPrice: number;
  nights: number;
}

export interface SearchParams {
  origin: string;
  destination: string;
  dateFrom: string;
  dateTo: string;
  minNights: number;
  maxNights: number;
  filters?: SearchFilters;
  apiFilters?: ApiFilters;
}

export interface OneWaySearchParams {
  origin: string;
  destination: string;
  dateFrom: string;
  dateTo: string;
  filters?: SearchFilters;
  apiFilters?: ApiFilters;
}

export type OneWayResult = FlightLeg;
