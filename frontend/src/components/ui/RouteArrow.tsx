import { View, StyleSheet } from "react-native";

// ---------------------------------------------------------------------------
// View-based arrow icon (no emoji) — matches the detail screen pattern.
// Renders a right-pointing chevron built from CSS borders.
// ---------------------------------------------------------------------------

interface RouteArrowProps {
  /** Overall icon size in points. Default 14. */
  size?: number;
  /** Chevron stroke color. Default blue-500. */
  color?: string;
}

export default function RouteArrow({ size = 14, color = "#3B82F6" }: RouteArrowProps) {
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          width: size * 0.55,
          height: size * 0.55,
          borderRightWidth: 2,
          borderTopWidth: 2,
          borderColor: color,
          transform: [{ rotate: "45deg" }],
          marginLeft: -(size * 0.15),
        }}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Route arrow with dashed line and circle — the full route visualization
// used between airport codes. Mirrors the detail screen's hero card pattern
// but at a configurable scale.
// ---------------------------------------------------------------------------

interface RouteArrowLineProps {
  /** Whether this is a round trip (shows bidirectional arrows). Default false. */
  roundTrip?: boolean;
  /** Circle diameter. Default 28. */
  circleSize?: number;
}

export function RouteArrowLine({ roundTrip = false, circleSize = 28 }: RouteArrowLineProps) {
  const arrowSize = roundTrip ? Math.round(circleSize * 0.38) : Math.round(circleSize * 0.5);

  return (
    <View style={lineStyles.wrap}>
      <View style={lineStyles.line} />
      <View
        style={[
          lineStyles.circle,
          {
            width: circleSize,
            height: circleSize,
            borderRadius: circleSize / 2,
          },
        ]}
      >
        {roundTrip ? (
          <View style={lineStyles.roundTripWrap}>
            <RouteArrow size={arrowSize} color="#3B82F6" />
            <View style={lineStyles.returnArrow}>
              <RouteArrow size={arrowSize} color="#3B82F6" />
            </View>
          </View>
        ) : (
          <RouteArrow size={arrowSize} color="#3B82F6" />
        )}
      </View>
      <View style={lineStyles.line} />
    </View>
  );
}

const lineStyles = StyleSheet.create({
  wrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(148, 163, 184, 0.3)",
  },
  circle: {
    backgroundColor: "rgba(59, 130, 246, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.12)",
  },
  roundTripWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
  },
  returnArrow: {
    transform: [{ rotate: "180deg" }],
  },
});
