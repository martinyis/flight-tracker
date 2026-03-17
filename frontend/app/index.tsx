import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  StatusBar,
  Animated,
  Easing,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import Svg, { Polyline, Defs, LinearGradient as SvgGradient, Stop, Polygon, Rect, Mask, G } from "react-native-svg";
import { ChevronRight } from "lucide-react-native";
import api from "../src/lib/api/client";
import MeshBackground from "../src/components/ui/MeshBackground";
import BottomNavBar from "../src/components/ui/BottomNavBar";
import { useAuth } from "../src/providers/AuthProvider";
import { usePendingSearch } from "../src/providers/PendingSearchProvider";
import { useHaptics } from "../src/providers/HapticsProvider";
import { fonts } from "../src/theme";
import { getCityByIata } from "../src/lib/utils/airportSearch";
import { timeAgo } from "../src/lib/utils/time";
import RouteArrow from "../src/components/ui/RouteArrow";
import PendingSearchBanner from "../src/components/PendingSearchBanner";

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const C = {
  primary: "#2F9CF4",
  primaryDark: "#1A7ED4",
  primary100: "#E0F2FE",
  primary200: "#BAE1FC",
  primary300: "#8FD0FA",
  warm500: "#F59E0B",
  warm100: "#FEF3C7",
  n900: "#0F172A",
  n700: "#334155",
  n500: "#64748B",
  n400: "#94A3B8",
  n300: "#CBD5E1",
  n200: "#E2E8F0",
  green: "#22C55E",
  greenDark: "#16A34A",
  greenBg: "rgba(34, 197, 94, 0.08)",
  greenBorder: "rgba(34, 197, 94, 0.2)",
  red: "#EF4444",
  redBg: "rgba(239, 68, 68, 0.08)",
  redBorder: "rgba(239, 68, 68, 0.2)",
  divider: "rgba(148, 163, 184, 0.15)",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SavedSearchSummary {
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
  trackingDays?: number | null;
  trackingStartedAt?: string | null;
  cheapestPrice: number | null;
  resultCount: number;
  airlineLogos: Record<string, string>;
  priceHistory: { date: string; cheapestPrice: number }[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getOverallTrend(
  history: { date: string; cheapestPrice: number }[] | undefined,
  currentPrice: number | null
): { direction: "up" | "down" | "stable"; amount: number } | null {
  if (!history || history.length < 2 || currentPrice == null) return null;
  const firstPrice = history[0].cheapestPrice;
  const diff = currentPrice - firstPrice;
  if (diff === 0) return { direction: "stable", amount: 0 };
  return { direction: diff < 0 ? "down" : "up", amount: Math.abs(diff) };
}

function getRecentTrend(
  history: { date: string; cheapestPrice: number }[] | undefined,
  currentPrice: number | null
): { direction: "up" | "down" | "stable"; amount: number } | null {
  if (!history || history.length < 2 || currentPrice == null) return null;
  const prev = history[history.length - 2].cheapestPrice;
  const diff = currentPrice - prev;
  if (diff === 0) return { direction: "stable", amount: 0 };
  return { direction: diff < 0 ? "down" : "up", amount: Math.abs(diff) };
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + "T00:00:00").getTime();
  return Math.max(0, Math.ceil((target - Date.now()) / 86400000));
}

function trackingDaysLeft(
  startedAt: string | null | undefined,
  days: number | null | undefined
): number | null {
  if (!startedAt || !days) return null;
  const end = new Date(startedAt).getTime() + days * 86400000;
  return Math.max(0, Math.ceil((end - Date.now()) / 86400000));
}

// ---------------------------------------------------------------------------
// Smart headline
// ---------------------------------------------------------------------------

function getSmartHeadline(searches: SavedSearchSummary[]): string {
  if (searches.length === 0) return "";

  for (const s of searches) {
    const t = getRecentTrend(s.priceHistory, s.cheapestPrice);
    if (t && t.direction === "down" && t.amount > 0) {
      return `${s.origin} to ${getCityByIata(s.destination) || s.destination} dropped $${t.amount}`;
    }
  }

  for (const s of searches) {
    const t = getRecentTrend(s.priceHistory, s.cheapestPrice);
    if (t && t.direction === "up" && t.amount >= 20) {
      return `${s.origin} to ${getCityByIata(s.destination) || s.destination} jumped $${t.amount}`;
    }
  }

  const priced = searches.filter((s) => s.cheapestPrice != null);
  if (priced.length > 0) {
    const best = priced.reduce((a, b) =>
      (a.cheapestPrice ?? Infinity) < (b.cheapestPrice ?? Infinity) ? a : b
    );
    return `Cheapest: ${best.origin} to ${getCityByIata(best.destination) || best.destination} at $${best.cheapestPrice}`;
  }

  const active = searches.filter((s) => s.active).length;
  if (active === 0) return "Your searches are paused";
  return `Watching ${searches.length} route${searches.length > 1 ? "s" : ""}`;
}

// ---------------------------------------------------------------------------
// Sparkline
// ---------------------------------------------------------------------------

function Sparkline({
  history,
  currentPrice,
}: {
  history: { date: string; cheapestPrice: number }[];
  currentPrice: number | null;
}) {
  if (!history || history.length < 3 || currentPrice == null) return null;

  const W = 64;
  const H = 28;
  const P = 3; // padding
  const prices = history.map((h) => h.cheapestPrice);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const points = prices.map((p, i) => {
    const x = P + (i / (prices.length - 1)) * (W - P * 2);
    const y = P + (1 - (p - min) / range) * (H - P * 2);
    return { x, y };
  });

  const linePts = points.map((p) => `${p.x},${p.y}`).join(" ");

  // Closed polygon for the fill area (line points + bottom corners)
  const fillPts =
    linePts +
    ` ${points[points.length - 1].x},${H} ${points[0].x},${H}`;

  const trending =
    currentPrice < prices[0] ? "down" : currentPrice > prices[0] ? "up" : "flat";
  const color = trending === "down" ? C.green : trending === "up" ? C.red : C.n400;
  const gradId = `spark-${trending}`;

  const maskId = `${gradId}-mask`;

  return (
    <Svg width={W} height={H}>
      <Defs>
        {/* Vertical gradient for the area fill */}
        <SvgGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.18} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </SvgGradient>
        {/* Horizontal opacity mask: fade in from left */}
        <SvgGradient id={`${maskId}-g`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#fff" stopOpacity={0} />
          <Stop offset="0.25" stopColor="#fff" stopOpacity={1} />
        </SvgGradient>
        <Mask id={maskId}>
          <Rect x={0} y={0} width={W} height={H} fill={`url(#${maskId}-g)`} />
        </Mask>
      </Defs>
      <G mask={`url(#${maskId})`}>
        <Polygon points={fillPts} fill={`url(#${gradId})`} />
        <Polyline
          points={linePts}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </G>
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

function LoadingState() {
  const pulse = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.35,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    a.start();
    return () => a.stop();
  }, []);

  return (
    <View style={loadStyles.wrap}>
      <Animated.View style={[loadStyles.dots, { opacity: pulse }]}>
        <View style={loadStyles.dot} />
        <View style={loadStyles.dot} />
        <View style={loadStyles.dot} />
      </Animated.View>
      <Animated.Text style={[loadStyles.text, { opacity: pulse }]}>
        Checking your flights...
      </Animated.Text>
    </View>
  );
}

const loadStyles = StyleSheet.create({
  wrap: { alignItems: "center", paddingTop: 80, paddingBottom: 80 },
  dots: { flexDirection: "row", gap: 8, marginBottom: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary300 },
  text: { fontFamily: fonts.medium, fontSize: 15, color: C.n500 },
});

// ---------------------------------------------------------------------------
// Search row
// ---------------------------------------------------------------------------

function SearchRow({
  item,
  index,
  onPress,
}: {
  item: SavedSearchSummary;
  index: number;
  onPress: () => void;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 450,
      delay: 60 + index * 60,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const trend = getOverallTrend(item.priceHistory, item.cheapestPrice);
  const isRT = item.tripType === "roundtrip";

  const meta: string[] = [];
  meta.push(`${formatDate(item.dateFrom)} - ${formatDate(item.dateTo)}`);
  if (isRT && item.minNights != null && item.maxNights != null) {
    meta.push(
      item.minNights === item.maxNights
        ? `${item.minNights}n`
        : `${item.minNights}-${item.maxNights}n`
    );
  }
  if (item.resultCount > 0) {
    meta.push(`${item.resultCount} flight${item.resultCount !== 1 ? "s" : ""}`);
  }

  let status = "";
  if (!item.active) {
    status = "Paused";
  } else {
    const left = trackingDaysLeft(item.trackingStartedAt, item.trackingDays);
    if (left != null) {
      status =
        left === 0 ? "Expires today" : left === 1 ? "Expires tomorrow" : `${left}d left`;
    } else if (item.lastCheckedAt) {
      status = `Checked ${timeAgo(item.lastCheckedAt)}`;
    }
  }

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [
          { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
        ],
      }}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [rS.row, pressed && rS.rowPressed]}
      >
        {/* Route + price */}
        <View style={rS.topLine}>
          <View style={rS.routeWrap}>
            <Text style={[rS.code, !item.active && rS.muted]}>{item.origin}</Text>
            <RouteArrow width={28} color={C.n300} />
            <Text style={[rS.code, !item.active && rS.muted]}>{item.destination}</Text>
          </View>
          <View style={rS.priceArea}>
            <Sparkline history={item.priceHistory} currentPrice={item.cheapestPrice} />
            {item.cheapestPrice != null ? (
              <Text style={[rS.price, !item.active && rS.muted]}>
                ${item.cheapestPrice}
              </Text>
            ) : (
              <Text style={rS.pricePending}>--</Text>
            )}
          </View>
        </View>

        {/* Trend pill */}
        {trend && trend.direction !== "stable" && (
          <View
            style={[
              rS.pill,
              trend.direction === "down" ? rS.pillDown : rS.pillUp,
            ]}
          >
            <Text
              style={[
                rS.pillText,
                { color: trend.direction === "down" ? C.greenDark : C.red },
              ]}
            >
              {trend.direction === "down" ? "\u2193" : "\u2191"} ${trend.amount}{" "}
              since tracking
            </Text>
          </View>
        )}

        {/* Meta + status */}
        <View style={rS.metaRow}>
          <Text style={rS.meta}>{meta.join("  \u00B7  ")}</Text>
          {status !== "" && (
            <Text style={[rS.status, !item.active && { opacity: 0.5 }]}>
              {status}
            </Text>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const rS = StyleSheet.create({
  row: { paddingVertical: 16, paddingHorizontal: 20, minHeight: 72 },
  rowPressed: { backgroundColor: "rgba(47, 156, 244, 0.04)" },
  muted: { opacity: 0.5 },
  topLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  routeWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  code: {
    fontFamily: fonts.extraBold,
    fontSize: 21,
    color: C.n900,
    letterSpacing: -0.6,
  },
  priceArea: { flexDirection: "row", alignItems: "center", gap: 8 },
  price: {
    fontFamily: fonts.extraBold,
    fontSize: 24,
    color: C.n900,
    letterSpacing: -0.8,
  },
  pricePending: { fontFamily: fonts.medium, fontSize: 20, color: C.n400 },
  pill: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
  },
  pillDown: { backgroundColor: C.greenBg, borderColor: C.greenBorder },
  pillUp: { backgroundColor: C.redBg, borderColor: C.redBorder },
  pillText: { fontFamily: fonts.semiBold, fontSize: 11, letterSpacing: -0.1 },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: C.n400 },
  status: { fontFamily: fonts.medium, fontSize: 12, color: C.n400 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.divider,
    marginHorizontal: 20,
  },
});

// ---------------------------------------------------------------------------
// Onboarding — Before / After split
// Shows the pain of manual date checking vs what Airfare does for you
// ---------------------------------------------------------------------------

function OnboardingState({ onAdd }: { onAdd: () => void }) {
  const fade = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(24)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 600,
        delay: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideUp, {
        toValue: 0,
        duration: 600,
        delay: 150,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Staggered fade for "with" section
  const fade2 = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade2, {
      toValue: 1,
      duration: 500,
      delay: 550,
      useNativeDriver: true,
    }).start();
  }, []);

  const PAIN_DATES = [
    { date: "Mar 10", price: "$412" },
    { date: "Mar 11", price: "$389" },
    { date: "Mar 12", price: "$445" },
    { date: "Mar 13", price: "$398" },
  ];

  return (
    <Animated.View
      style={[obS.wrap, { opacity: fade, transform: [{ translateY: slideUp }] }]}
    >
      {/* Hero headline */}
      <Text style={obS.title}>
        You pick the dates.{"\n"}
        <Text style={obS.titleAccent}>We find the deal.</Text>
      </Text>
      <Text style={obS.subtitle}>
        Give us a flexible range and we'll search every date combination to
        find the absolute cheapest flight.
      </Text>

      {/* ── "Without" section ── */}
      <Text style={obS.sectionLabel}>WITHOUT AIRFARE</Text>
      <View style={obS.painWrap}>
        {PAIN_DATES.map((d, i) => (
          <View key={i} style={obS.painRow}>
            <Text style={obS.painDate}>{d.date}?</Text>
            <View style={obS.painDots} />
            <Text style={obS.painPrice}>{d.price}</Text>
          </View>
        ))}
        <Text style={obS.painFade}>
          ...and 200 more combinations to check
        </Text>
      </View>

      {/* Arrow down */}
      <View style={obS.arrowWrap}>
        <View style={obS.arrowStem} />
        <View style={obS.arrowPoint} />
      </View>

      {/* ── "With Airfare" section ── */}
      <Animated.View style={{ opacity: fade2 }}>
        <Text style={[obS.sectionLabel, { color: C.primary }]}>
          WITH AIRFARE
        </Text>
        <View style={obS.winWrap}>
          <View style={obS.winRow}>
            <View style={[obS.winDot, { backgroundColor: C.primary }]} />
            <Text style={obS.winText}>
              <Text style={obS.winBold}>200+ combos</Text> searched in seconds
            </Text>
          </View>
          <View style={obS.winRow}>
            <View style={[obS.winDot, { backgroundColor: C.green }]} />
            <Text style={obS.winText}>
              <Text style={obS.winBold}>Cheapest found:</Text>{" "}
              <Text style={obS.winHighlight}>Mar 18 — $241</Text>
            </Text>
          </View>
          <View style={obS.winRow}>
            <View style={[obS.winDot, { backgroundColor: C.warm500 }]} />
            <Text style={obS.winText}>
              <Text style={obS.winBold}>Price drops?</Text> We'll notify you
              instantly
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* CTA */}
      <Pressable
        style={({ pressed }) => [obS.cta, pressed && obS.ctaPressed]}
        onPress={onAdd}
      >
        <Text style={obS.ctaText}>Find my cheapest flight</Text>
        <ChevronRight size={18} color="#FFF" strokeWidth={2.5} />
      </Pressable>
    </Animated.View>
  );
}

const obS = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  title: {
    fontFamily: fonts.extraBold,
    fontSize: 24,
    color: C.n900,
    letterSpacing: -0.6,
    lineHeight: 30,
    marginBottom: 8,
  },
  titleAccent: {
    color: C.primary,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: C.n500,
    lineHeight: 20,
    marginBottom: 28,
  },

  // Section labels
  sectionLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: C.n400,
    letterSpacing: 0.8,
    marginBottom: 8,
  },

  // "Without" pain section
  painWrap: {
    marginBottom: 2,
  },
  painRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
  },
  painDate: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: C.n400,
    width: 58,
  },
  painDots: {
    flex: 1,
    height: 1,
    borderStyle: "dotted",
    borderBottomWidth: 1,
    borderColor: C.n300,
    marginHorizontal: 6,
  },
  painPrice: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: C.n400,
  },
  painFade: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: C.n300,
    marginTop: 4,
    fontStyle: "italic",
  },

  // Arrow connector
  arrowWrap: {
    alignItems: "center",
    paddingVertical: 14,
  },
  arrowStem: {
    width: 1.5,
    height: 20,
    backgroundColor: C.n300,
  },
  arrowPoint: {
    width: 7,
    height: 7,
    borderRightWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: C.n300,
    transform: [{ rotate: "45deg" }],
    marginTop: -4,
  },

  // "With Airfare" win section
  winWrap: {
    gap: 12,
    marginBottom: 2,
  },
  winRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  winDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginTop: 5,
  },
  winText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: C.n700,
    lineHeight: 19,
  },
  winBold: {
    fontFamily: fonts.semiBold,
    color: C.n900,
  },
  winHighlight: {
    fontFamily: fonts.bold,
    color: C.green,
  },

  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 28,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaPressed: {
    backgroundColor: C.primaryDark,
    transform: [{ scale: 0.97 }],
  },
  ctaText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: "#FFF",
    letterSpacing: 0.2,
  },
});

// ---------------------------------------------------------------------------
// Price Intelligence — flat rows on background, no cards
// ---------------------------------------------------------------------------

function PriceIntelligence({ searches }: { searches: SavedSearchSummary[] }) {
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 600,
      delay: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  type Row = { label: string; value: string; sub: string; accent: string };
  const rows: Row[] = [];

  // Best deal
  const priced = searches.filter((s) => s.cheapestPrice != null);
  if (priced.length > 0) {
    const best = priced.reduce((a, b) =>
      (a.cheapestPrice ?? Infinity) < (b.cheapestPrice ?? Infinity) ? a : b
    );
    rows.push({
      label: "Best deal",
      value: `$${best.cheapestPrice}`,
      sub: `${best.origin} \u2192 ${getCityByIata(best.destination) || best.destination}`,
      accent: C.green,
    });
  }

  // Next departure
  const upcoming = searches
    .filter((s) => daysUntil(s.dateFrom) > 0)
    .sort((a, b) => daysUntil(a.dateFrom) - daysUntil(b.dateFrom));
  if (upcoming.length > 0) {
    const next = upcoming[0];
    const d = daysUntil(next.dateFrom);
    rows.push({
      label: "Next trip",
      value: d === 1 ? "Tomorrow" : `${d} days`,
      sub: `${next.origin} \u2192 ${getCityByIata(next.destination) || next.destination}`,
      accent: C.primary,
    });
  }

  // Biggest move
  const hist = searches.filter(
    (s) => s.priceHistory && s.priceHistory.length >= 2 && s.cheapestPrice != null
  );
  if (hist.length > 0) {
    let big: SavedSearchSummary | null = null;
    let bigD = 0;
    for (const s of hist) {
      const h = s.priceHistory;
      const delta = Math.abs(h[h.length - 1].cheapestPrice - h[h.length - 2].cheapestPrice);
      if (delta > bigD) {
        bigD = delta;
        big = s;
      }
    }
    if (big && bigD > 0) {
      const dir =
        big.priceHistory[big.priceHistory.length - 1].cheapestPrice <
        big.priceHistory[big.priceHistory.length - 2].cheapestPrice;
      rows.push({
        label: dir ? "Price drop" : "Price spike",
        value: `${dir ? "\u2193" : "\u2191"} $${bigD}`,
        sub: `${big.origin} \u2192 ${getCityByIata(big.destination) || big.destination}`,
        accent: dir ? C.green : C.red,
      });
    }
  }

  if (rows.length === 0) return null;

  return (
    <Animated.View style={[iS.wrap, { opacity: fade }]}>
      <Text style={iS.sectionLabel}>INSIGHTS</Text>
      {rows.map((row, i) => (
        <View key={i} style={iS.row}>
          <View style={iS.rowLeft}>
            <Text style={[iS.label, { color: row.accent }]}>{row.label}</Text>
            <Text style={iS.sub}>{row.sub}</Text>
          </View>
          <Text style={iS.value}>{row.value}</Text>
          {i < rows.length - 1 && <View style={iS.divider} />}
        </View>
      ))}
    </Animated.View>
  );
}

const iS = StyleSheet.create({
  wrap: { paddingTop: 24 },
  sectionLabel: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: C.n400,
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  rowLeft: { flex: 1 },
  label: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    letterSpacing: -0.1,
  },
  sub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: C.n500,
    marginTop: 2,
  },
  value: {
    fontFamily: fonts.extraBold,
    fontSize: 18,
    color: C.n900,
    letterSpacing: -0.4,
  },
  divider: {
    position: "absolute",
    bottom: 0,
    left: 20,
    right: 20,
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.divider,
  },
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function HomeScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const insets = useSafeAreaInsets();
  const [searches, setSearches] = useState<SavedSearchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { pending } = usePendingSearch();

  const fetchSearches = async () => {
    setFetchError(null);
    try {
      const res = await api.get("/search");
      setSearches(res.data);
    } catch (err: any) {
      setFetchError(
        err.response?.data?.error ?? err.message ?? "Couldn't load your searches"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchSearches(); }, []));

  // Auto-refresh search list when background search completes
  useEffect(() => {
    if (pending?.status === "completed") {
      fetchSearches();
    }
  }, [pending?.status]);

  const onRefresh = () => {
    haptics.light();
    setRefreshing(true);
    fetchSearches();
  };

  const { userName } = useAuth();
  const greeting = userName ? `${getGreeting()}, ${userName}` : getGreeting();
  const headline = getSmartHeadline(searches);
  const hasSearches = !loading && searches.length > 0;

  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 600,
      delay: 100,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <MeshBackground />

      <View style={[s.safe, { paddingTop: insets.top }]}>
        <FlatList
          data={hasSearches ? searches : []}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item, index }) => (
            <SearchRow
              item={item}
              index={index}
              onPress={() => { haptics.light(); router.push(`/search/${item.id}`); }}
            />
          )}
          ItemSeparatorComponent={() => <View style={rS.divider} />}
          contentContainerStyle={[s.scroll, { paddingBottom: 100 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={C.primary}
              colors={[C.primary]}
            />
          }
          ListHeaderComponent={
            <>
              {/* Header */}
              <Animated.View style={[s.header, { opacity: fade }]}>
                <Text style={s.greeting}>{greeting}</Text>
                {headline !== "" && (
                  <Text style={s.headline}>{headline}</Text>
                )}
              </Animated.View>

              {/* Pending search banner */}
              <PendingSearchBanner />

              {/* Divider separating header from content */}
              {hasSearches && <View style={s.headerDivider} />}

              {/* Section label for searches */}
              {hasSearches && <Text style={s.sectionLabel}>YOUR ROUTES</Text>}

              {/* Loading / Error / Empty states */}
              {loading && <LoadingState />}
              {!loading && fetchError && searches.length === 0 && (
                <View style={s.errorState}>
                  <Text style={s.errorText}>{fetchError}</Text>
                  <Pressable
                    style={s.retryBtn}
                    onPress={() => {
                      haptics.light();
                      setLoading(true);
                      fetchSearches();
                    }}
                  >
                    <Text style={s.retryText}>Tap to retry</Text>
                  </Pressable>
                </View>
              )}
              {!loading && !fetchError && searches.length === 0 && (
                <OnboardingState onAdd={() => { haptics.medium(); router.push("/add-search"); }} />
              )}
            </>
          }
          ListFooterComponent={
            hasSearches ? <PriceIntelligence searches={searches} /> : null
          }
        />

        <BottomNavBar />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#DCEEFB" },
  safe: { flex: 1 },
  scroll: { flexGrow: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  greeting: {
    fontFamily: fonts.bold,
    fontSize: 30,
    color: C.n900,
    letterSpacing: -0.6,
    lineHeight: 36,
    marginBottom: 4,
  },
  headline: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: C.primary,
    letterSpacing: 0.1,
    lineHeight: 20,
  },
  headerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.divider,
    marginHorizontal: 20,
  },
  sectionLabel: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: C.n400,
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  errorState: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 80,
    gap: 12,
  },
  errorText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: C.n500,
    textAlign: "center",
    lineHeight: 22,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: C.primary,
  },
  retryText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: "#fff",
  },
});
