/**
 * Centralized design tokens -- single source of truth for all color values.
 *
 * Aligned with DESIGN_SYSTEM.md.
 * Import as: import { colors } from "@/theme";
 */

export const colors = {
  // Primary accent
  primary: "#2F9CF4",
  primaryDark: "#1A7ED4",
  primary100: "#E0F2FE",
  primary200: "#BAE1FC",
  primary300: "#8FD0FA",

  // Neutral palette
  neutral900: "#0F172A",
  neutral700: "#334155",
  neutral500: "#64748B",
  neutral400: "#94A3B8",
  neutral300: "#CBD5E1",
  neutral200: "#E2E8F0",
  neutral100: "#F1F5F9",

  // Success / Green
  success: "#22C55E",
  successDark: "#16A34A",
  successBg: "rgba(34, 197, 94, 0.08)",
  successBorder: "rgba(34, 197, 94, 0.2)",

  // Error / Red
  error: "#EF4444",
  errorDark: "#DC2626",
  errorBg: "rgba(239, 68, 68, 0.08)",
  errorBorder: "rgba(239, 68, 68, 0.2)",

  // Warm / Amber
  warm: "#F59E0B",
  warm100: "#FEF3C7",

  // Surface / Background
  background: "#DCEEFB",
  divider: "rgba(148, 163, 184, 0.15)",
  dividerStrong: "rgba(148, 163, 184, 0.2)",

  // Static
  white: "#FFFFFF",
  black: "#000000",
} as const;

export type ColorKey = keyof typeof colors;
