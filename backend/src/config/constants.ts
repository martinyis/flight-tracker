// Combo limits
export const COMBO_HARD_CAP = 200;

// Timing
export const REFRESH_MIN_INTERVAL_MS = 8 * 3600_000; // 8 hours
export const DEDUP_WINDOW_MS = 24 * 3600_000; // 24 hours
export const CRON_GROUP_DELAY_MS = 2000;

// Sentinel strategy
export const SENTINEL_TOLERANCE = 2; // dollars
export const SENTINEL_CONCURRENCY = 3;

// SerpAPI
export const SERP_COST_PER_CALL = 0.025;
export const SERP_CONCURRENCY = 5;

// Results
export const TOP_HYDRATE_COUNT = 4;
export const TOP_RESULTS_LIMIT = 10;
export const RAW_LEGS_POOL_SIZE = 50;

// Credits
export const SIGNUP_BONUS = 50;

// Tracking
export const ALLOWED_TRACKING_PRESETS = [7, 14, 30] as const;

// Airlines
export const VALID_ALLIANCES = ["STAR_ALLIANCE", "SKYTEAM", "ONEWORLD"] as const;

/** Static fallback: airline full name → 2-letter IATA code */
export const AIRLINE_NAME_TO_CODE: Record<string, string> = {
  "Southwest": "WN", "Southwest Airlines": "WN",
  "United": "UA", "United Airlines": "UA",
  "Delta": "DL", "Delta Air Lines": "DL",
  "American": "AA", "American Airlines": "AA",
  "JetBlue": "B6", "JetBlue Airways": "B6",
  "Spirit": "NK", "Spirit Airlines": "NK",
  "Frontier": "F9", "Frontier Airlines": "F9",
  "Alaska": "AS", "Alaska Airlines": "AS",
  "Hawaiian": "HA", "Hawaiian Airlines": "HA",
  "Allegiant": "G4", "Allegiant Air": "G4",
  "Sun Country": "SY", "Sun Country Airlines": "SY",
  "Breeze": "MX", "Breeze Airways": "MX",
  "Air Canada": "AC",
  "WestJet": "WS",
  "Volaris": "Y4",
  "VivaAerobus": "VB",
  "Aeromexico": "AM",
  "Copa": "CM", "Copa Airlines": "CM",
  "LATAM": "LA", "LATAM Airlines": "LA",
  "Avianca": "AV",
  "British Airways": "BA",
  "Lufthansa": "LH",
  "Air France": "AF",
  "KLM": "KL", "KLM Royal Dutch Airlines": "KL",
  "Iberia": "IB",
  "Swiss": "LX", "SWISS": "LX",
  "Austrian": "OS", "Austrian Airlines": "OS",
  "Brussels Airlines": "SN",
  "Scandinavian Airlines": "SK", "SAS": "SK",
  "Norwegian": "DY", "Norwegian Air": "DY",
  "Ryanair": "FR",
  "easyJet": "U2",
  "Wizz Air": "W6",
  "Vueling": "VY",
  "Turkish Airlines": "TK",
  "Emirates": "EK",
  "Qatar Airways": "QR",
  "Etihad": "EY", "Etihad Airways": "EY",
  "Singapore Airlines": "SQ",
  "Cathay Pacific": "CX",
  "Japan Airlines": "JL", "JAL": "JL",
  "ANA": "NH", "All Nippon Airways": "NH",
  "Korean Air": "KE",
  "Asiana Airlines": "OZ",
  "Qantas": "QF",
  "Air New Zealand": "NZ",
  "Virgin Atlantic": "VS",
  "Aer Lingus": "EI",
  "Icelandair": "FI",
  "TAP Air Portugal": "TP", "Tap Air Portugal": "TP",
  "LOT Polish Airlines": "LO",
  "Finnair": "AY",
  "Air India": "AI",
  "China Airlines": "CI",
  "EVA Air": "BR",
  "Philippine Airlines": "PR",
  "Thai Airways": "TG",
  "Vietnam Airlines": "VN",
  "Condor": "DE",
  "JetStar": "JQ", "Jetstar": "JQ",
  "Fiji Airways": "FJ",
};
