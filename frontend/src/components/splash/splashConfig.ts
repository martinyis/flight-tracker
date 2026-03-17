import { colors } from "../../theme";

// ── Which splash to show (change this to test different variants) ──
export type SplashVariant = "priceDrop" | "departureBoard" | "priceMatrix" | "icon";
export const ACTIVE_SPLASH: SplashVariant = "icon";

// ── Timing ──
export const SPLASH_FADE_OUT_MS = 400;

// ── Colors (dark splash palette) ──
export const SC = {
  darkBg: "#0A1628",
  warmBg: "#1A0F04",
  tileBg: "#111D30",
  tileBorder: "#1E293B",
  green: colors.success,
  primary: colors.primary,
  amber: colors.warm,
  white: colors.white,
  dimText: "rgba(255,255,255,0.2)",
  midText: "rgba(255,255,255,0.45)",
} as const;
