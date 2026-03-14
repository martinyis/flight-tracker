import { View, StyleSheet } from "react-native";

// ---------------------------------------------------------------------------
// Dot-tipped route arrow — a clean line with a filled dot at the end.
// Used between airport codes on both home and detail screens.
// ---------------------------------------------------------------------------

interface RouteArrowProps {
  /** Width of the arrow line. Default 28. */
  width?: number;
  /** Line + dot color. Default neutral-300. */
  color?: string;
  /** Line thickness. Default 1.5. */
  stroke?: number;
  /** Dot diameter. Default 4. */
  dotSize?: number;
}

export default function RouteArrow({
  width = 28,
  color = "#CBD5E1",
  stroke = 1.5,
  dotSize = 4,
}: RouteArrowProps) {
  return (
    <View style={[styles.wrap, { width }]}>
      <View style={[styles.line, { height: stroke, backgroundColor: color }]} />
      <View
        style={[
          styles.dot,
          {
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Larger route arrow with circle accent — used in the detail screen hero.
// The line extends through a subtle tinted circle for visual emphasis.
// ---------------------------------------------------------------------------

interface RouteArrowHeroProps {
  /** Total width of the arrow. Default 48. */
  width?: number;
  /** Circle diameter in the center. Default 22. */
  circleSize?: number;
  /** Whether this is a round trip. Default false. */
  roundTrip?: boolean;
}

export function RouteArrowHero({
  width = 48,
  circleSize = 22,
  roundTrip = false,
}: RouteArrowHeroProps) {
  const dotSize = 4;
  return (
    <View style={[styles.heroWrap, { width }]}>
      <View style={styles.heroLine} />
      <View
        style={[
          styles.heroCircle,
          {
            width: circleSize,
            height: circleSize,
            borderRadius: circleSize / 2,
          },
        ]}
      >
        {roundTrip ? (
          <View style={styles.biArrows}>
            <View style={[styles.heroDot, { width: dotSize, height: dotSize, borderRadius: dotSize / 2 }]} />
            <View style={styles.heroInnerLine} />
            <View style={[styles.heroDot, { width: dotSize, height: dotSize, borderRadius: dotSize / 2 }]} />
          </View>
        ) : (
          <View style={styles.heroArrowInner}>
            <View style={styles.heroInnerLine} />
            <View style={[styles.heroDot, { width: dotSize, height: dotSize, borderRadius: dotSize / 2 }]} />
          </View>
        )}
      </View>
      <View style={styles.heroLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  // --- Dot-tipped arrow (compact) ---
  wrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  line: {
    flex: 1,
  },
  dot: {
    marginLeft: -1,
  },

  // --- Hero arrow with circle ---
  heroWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: "#CBD5E1",
  },
  heroCircle: {
    backgroundColor: "rgba(47, 156, 244, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(47, 156, 244, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
  },
  heroArrowInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
  },
  heroInnerLine: {
    width: 6,
    height: 1.5,
    backgroundColor: "#2F9CF4",
  },
  heroDot: {
    backgroundColor: "#2F9CF4",
  },
  biArrows: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
});
