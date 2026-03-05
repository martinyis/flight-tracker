/**
 * Centralized Outfit typography config.
 *
 * In React Native, custom fonts CANNOT use fontFamily + fontWeight together.
 * Instead, each weight is a separate fontFamily name. This module provides
 * a single source of truth so swapping fonts later requires only changing
 * the values here.
 *
 * Usage:
 *   import { fonts } from "../utils/fonts";
 *   // in StyleSheet:
 *   title: { fontFamily: fonts.bold, fontSize: 28 }
 *
 * NOTE: Outfit does not ship italic variants. The italic keys below map to
 * the corresponding upright weight so existing code that references them
 * (e.g. fonts.regularItalic for "No data yet" placeholder) won't break.
 */

// ---------------------------------------------------------------------------
// Font family names -- each maps to a loaded Outfit variant
// ---------------------------------------------------------------------------

export const fonts = {
  /** Weight 100 */
  thin: "Outfit_100Thin",
  /** Weight 200 */
  extraLight: "Outfit_200ExtraLight",
  /** Weight 300 */
  light: "Outfit_300Light",
  /** Weight 400 -- default body text */
  regular: "Outfit_400Regular",
  /** Weight 500 */
  medium: "Outfit_500Medium",
  /** Weight 600 */
  semiBold: "Outfit_600SemiBold",
  /** Weight 700 */
  bold: "Outfit_700Bold",
  /** Weight 800 -- prices, airport codes */
  extraBold: "Outfit_800ExtraBold",
  /** Weight 900 */
  black: "Outfit_900Black",

  // Italic fallbacks -- Outfit has NO italic variants.
  // These map to the matching upright weight so any existing
  // fonts.regularItalic (etc.) references continue to work.
  /** Weight 100 italic (falls back to upright) */
  thinItalic: "Outfit_100Thin",
  /** Weight 200 italic (falls back to upright) */
  extraLightItalic: "Outfit_200ExtraLight",
  /** Weight 300 italic (falls back to upright) */
  lightItalic: "Outfit_300Light",
  /** Weight 400 italic (falls back to upright) */
  regularItalic: "Outfit_400Regular",
  /** Weight 500 italic (falls back to upright) */
  mediumItalic: "Outfit_500Medium",
  /** Weight 600 italic (falls back to upright) */
  semiBoldItalic: "Outfit_600SemiBold",
  /** Weight 700 italic (falls back to upright) */
  boldItalic: "Outfit_700Bold",
  /** Weight 800 italic (falls back to upright) */
  extraBoldItalic: "Outfit_800ExtraBold",
  /** Weight 900 italic (falls back to upright) */
  blackItalic: "Outfit_900Black",
} as const;

export type FontKey = keyof typeof fonts;
