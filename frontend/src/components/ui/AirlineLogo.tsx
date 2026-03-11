import { useState } from "react";
import { View, Image, Text, StyleSheet } from "react-native";
import { fonts } from "../../theme";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AirlineLogoProps {
  /** Full airline name, e.g. "United" -- used for fallback initial */
  airline: string;
  /** Logo URL from SerpAPI / Google CDN. Falls back to initial if missing */
  logoUrl?: string;
  /** Diameter in points. Defaults to 24 */
  size?: number;
  /** Background color for the image container. Defaults to #F1F5F9 */
  bgColor?: string;
}

// ---------------------------------------------------------------------------
// Deterministic color from airline name -- keeps fallback circles visually
// distinct without randomness.
// ---------------------------------------------------------------------------

const FALLBACK_COLORS = [
  "#3B82F6", // blue
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#F59E0B", // amber
  "#10B981", // emerald
  "#06B6D4", // cyan
  "#6366F1", // indigo
  "#EF4444", // red
  "#14B8A6", // teal
  "#F97316", // orange
];

function colorForAirline(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AirlineLogo({
  airline,
  logoUrl,
  size = 24,
  bgColor: containerBgColor = "#F1F5F9",
}: AirlineLogoProps) {
  const [failed, setFailed] = useState(false);

  const showImage = !!logoUrl && !failed;
  const initial = airline.charAt(0).toUpperCase();
  const fallbackBg = colorForAirline(airline);

  // Scale font size relative to circle diameter
  const fontSize = Math.round(size * 0.46);

  if (showImage) {
    return (
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: containerBgColor,
          },
        ]}
      >
        <Image
          source={{ uri: logoUrl }}
          style={{
            width: size * 0.78,
            height: size * 0.78,
          }}
          resizeMode="contain"
          onError={() => setFailed(true)}
        />
      </View>
    );
  }

  // Fallback: colored circle with first letter
  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: fallbackBg,
        },
      ]}
    >
      <Text
        style={[
          styles.initial,
          { fontSize, lineHeight: fontSize + 2 },
        ]}
      >
        {initial}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  initial: {
    fontFamily: fonts.bold,
    color: "#FFFFFF",
    textAlign: "center",
  },
});
