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

// Credits
export const SIGNUP_BONUS = 50;

// Tracking
export const ALLOWED_TRACKING_PRESETS = [7, 14, 30] as const;

// Airlines
export const VALID_ALLIANCES = ["STAR_ALLIANCE", "SKYTEAM", "ONEWORLD"] as const;
