import { useEffect, useRef } from "react";
import { View, Text, Pressable, Animated, Easing, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import AirlineLogo from "./AirlineLogo";
import { RouteArrowLine } from "./RouteArrow";
import { getCityByIata } from "../utils/airportSearch";
import { timeAgo } from "../utils/time";
import { fonts } from "../utils/fonts";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface FlightPanelData {
  id: number;
  tripType: "roundtrip" | "oneway";
  origin: string;
  destination: string;
  dateFrom: string;
  dateTo: string;
  minNights?: number;
  maxNights?: number;
  active: boolean;
  lastCheckedAt: string | null;
  cheapestPrice: number | null;
  resultCount: number;
  airlineLogos: Record<string, string>;
}

interface FlightPanelProps {
  data: FlightPanelData;
  onPress: () => void;
  zIndex: number;
  isFirst: boolean;
  isLast?: boolean;
  /** 0-based index used for stagger delay and subtle color shift */
  index: number;
}

// ---------------------------------------------------------------------------
// Pulsing "Searching..." text
// ---------------------------------------------------------------------------

function PulsingText({ text }: { text: string }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Animated.Text style={[styles.priceSearching, { opacity }]}>
      {text}
    </Animated.Text>
  );
}

// ---------------------------------------------------------------------------
// Date formatter
// ---------------------------------------------------------------------------

function formatDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Subtle per-panel background tints so panels look distinguishable
// ---------------------------------------------------------------------------

const PANEL_TINTS = [
  "rgba(255, 255, 255, 0.72)",  // panel 0 — most opaque
  "rgba(255, 255, 255, 0.65)",  // panel 1
  "rgba(248, 250, 255, 0.68)",  // panel 2 — very slight blue tint
  "rgba(255, 255, 255, 0.62)",  // panel 3
  "rgba(248, 250, 255, 0.65)",  // panel 4
  "rgba(255, 255, 255, 0.60)",  // panel 5+
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function FlightPanel({
  data,
  onPress,
  zIndex,
  isFirst,
  isLast = false,
  index,
}: FlightPanelProps) {
  const originCity = getCityByIata(data.origin);
  const destCity = getCityByIata(data.destination);
  const isRoundTrip = data.tripType === "roundtrip";
  const logoEntries = Object.entries(data.airlineLogos);
  const bgTint = PANEL_TINTS[Math.min(index, PANEL_TINTS.length - 1)];

  // Entrance animation with stagger
  const enterAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enterAnim, {
      toValue: 1,
      duration: 450,
      delay: 80 + index * 60,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const enterTranslateY = enterAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  return (
    <Animated.View
      style={{
        zIndex,
        opacity: enterAnim,
        transform: [{ translateY: enterTranslateY }],
      }}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.pressable,
          isFirst && styles.pressableFirst,
          isLast && styles.pressableLast,
          !data.active && styles.paused,
          pressed && styles.pressed,
        ]}
      >
        <BlurView
          intensity={50}
          tint="light"
          style={[
            styles.blur,
            isFirst && styles.blurFirst,
            isLast && styles.blurLast,
          ]}
        >
          <View style={[styles.inner, { backgroundColor: bgTint }]}>
            {/* Visible top edge line — creates the "sheet edge" effect */}
            {!isFirst && <View style={styles.topEdge} />}

            {/* === Route section === */}
            <View style={styles.routeSection}>
              <View style={styles.routeRow}>
                <View style={styles.routeEndpoint}>
                  <Text style={styles.airportCode}>{data.origin}</Text>
                  <Text style={styles.cityName} numberOfLines={1}>
                    {originCity}
                  </Text>
                </View>

                <RouteArrowLine roundTrip={isRoundTrip} circleSize={28} />

                <View style={[styles.routeEndpoint, styles.routeEndpointRight]}>
                  <Text style={[styles.airportCode, styles.airportCodeRight]}>
                    {data.destination}
                  </Text>
                  <Text style={[styles.cityName, styles.cityNameRight]} numberOfLines={1}>
                    {destCity}
                  </Text>
                </View>
              </View>
            </View>

            {/* === Price section === */}
            <View style={styles.priceSection}>
              {data.cheapestPrice != null ? (
                <>
                  <Text style={styles.priceValue}>${data.cheapestPrice}</Text>
                  <Text style={styles.priceLabel}>cheapest found</Text>
                </>
              ) : (
                <PulsingText text="Searching..." />
              )}
            </View>

            {/* === Divider === */}
            <View style={styles.divider} />

            {/* === Meta footer === */}
            <View style={styles.metaRow}>
              <View style={styles.metaLeft}>
                <Text style={styles.metaText}>
                  {formatDate(data.dateFrom)} {"\u2013"} {formatDate(data.dateTo)}
                  {isRoundTrip && data.minNights != null
                    ? `  \u00B7  ${data.minNights}\u2013${data.maxNights}n`
                    : ""}
                </Text>
              </View>
              <View style={styles.metaRight}>
                {logoEntries.length > 0 && (
                  <View style={styles.logoRow}>
                    {logoEntries.map(([airline, url], i) => (
                      <View key={airline} style={i > 0 ? styles.logoOverlap : undefined}>
                        <AirlineLogo airline={airline} logoUrl={url} size={18} />
                      </View>
                    ))}
                  </View>
                )}
                {data.resultCount > 0 && (
                  <Text style={styles.metaText}>
                    {data.resultCount} flt{data.resultCount !== 1 ? "s" : ""}
                  </Text>
                )}
              </View>
            </View>

            {/* === Status row === */}
            <View style={styles.statusRow}>
              <Text style={styles.checkedText}>
                {data.lastCheckedAt
                  ? `Checked ${timeAgo(data.lastCheckedAt)}`
                  : "Not yet checked"}
              </Text>
              {!data.active && (
                <View style={styles.pausedPill}>
                  <Text style={styles.pausedPillText}>Paused</Text>
                </View>
              )}
            </View>
          </View>
        </BlurView>
      </Pressable>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  pressable: {
    overflow: "hidden",
    // Subtle shadow for depth between panels
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  pressableFirst: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    // First panel: no upward shadow bleed
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  pressableLast: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    shadowOpacity: 0.05,
  },
  paused: {
    opacity: 0.45,
  },

  blur: {
    overflow: "hidden",
  },
  blurFirst: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  blurLast: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },

  inner: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
  },

  // Thin line at top of each non-first panel — the "sheet edge"
  topEdge: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    height: 1,
    backgroundColor: "rgba(148, 163, 184, 0.15)",
  },

  // ---- Route ----
  routeSection: {
    marginBottom: 12,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  routeEndpoint: {
    alignItems: "flex-start",
    width: 76,
  },
  routeEndpointRight: {
    alignItems: "flex-end",
  },
  airportCode: {
    fontFamily: fonts.extraBold,
    fontSize: 24,
    color: "#0F172A",
    letterSpacing: -0.8,
  },
  airportCodeRight: {
    textAlign: "right",
  },
  cityName: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 1,
    letterSpacing: 0.1,
  },
  cityNameRight: {
    textAlign: "right",
  },

  // ---- Price ----
  priceSection: {
    alignItems: "center",
    marginBottom: 16,
  },
  priceValue: {
    fontFamily: fonts.extraBold,
    fontSize: 36,
    color: "#0F172A",
    letterSpacing: -1.2,
    lineHeight: 40,
  },
  priceLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  priceSearching: {
    fontFamily: fonts.medium,
    fontSize: 20,
    color: "#94A3B8",
    letterSpacing: -0.3,
  },

  // ---- Divider ----
  divider: {
    height: 1,
    backgroundColor: "rgba(226, 232, 240, 0.5)",
    marginBottom: 12,
  },

  // ---- Meta footer ----
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  metaLeft: {
    flex: 1,
  },
  metaRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: "#94A3B8",
    letterSpacing: -0.1,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoOverlap: {
    marginLeft: -4,
  },

  // ---- Status row ----
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  checkedText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: "#CBD5E1",
    letterSpacing: 0.1,
  },
  pausedPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: "rgba(241, 245, 249, 0.8)",
  },
  pausedPillText: {
    fontFamily: fonts.semiBold,
    fontSize: 10,
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
});
