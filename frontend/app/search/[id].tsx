import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Animated,
  StatusBar,
  LayoutAnimation,
  Platform,
  UIManager,
  type LayoutChangeEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import api from "../../src/lib/api/client";
import {
  RoundTripStrip,
  OneWayStrip,
  FloatingLayersContainer,
} from "../../src/components/flights/FlightStrip";
import BackButton from "../../src/components/ui/BackButton";
import AirlineLogo from "../../src/components/ui/AirlineLogo";
import { timeAgo } from "../../src/lib/utils/time";
import { fonts } from "../../src/theme";

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FlightLeg {
  date: string;
  price: number;
  airline: string;
  departure_time: string;
  arrival_time: string;
  duration: number;
  stops: number;
  departure_token?: string;
  booking_token?: string;
}

interface Combo {
  outbound: FlightLeg;
  return?: FlightLeg;
  totalPrice: number;
  nights: number;
  /** Present on non-hydrated cron data (RoundTripRawOption format) */
  price?: number;
}

interface SearchFilters {
  airlines?: string[];
}

interface SavedSearch {
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
  latestResults: (Combo | FlightLeg)[];
  filters: SearchFilters;
  availableAirlines: string[];
  airlineLogos?: Record<string, string>;
  trackingPaid?: boolean;
  trackingFee?: number;
  comboCount?: number;
}

// ---------------------------------------------------------------------------
// Mesh background
// ---------------------------------------------------------------------------

function MeshBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={["#E0EDFF", "#EEF4FF", "#F6F9FF", "#FAFCFF"]}
        locations={[0, 0.3, 0.65, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={["rgba(147, 197, 253, 0.15)", "transparent"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.55 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={["transparent", "rgba(165, 180, 252, 0.08)"]}
        start={{ x: 0, y: 0.4 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={["transparent", "rgba(103, 232, 249, 0.06)", "transparent"]}
        locations={[0, 0.5, 1]}
        start={{ x: 1, y: 0.2 }}
        end={{ x: 0, y: 0.6 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// View-based icons (no emojis)
// ---------------------------------------------------------------------------

function ArrowIcon({ size = 14, color = "#2F9CF4" }: { size?: number; color?: string }) {
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

function TrashIcon({ color = "#EF4444" }: { color?: string }) {
  return (
    <View style={{ width: 16, height: 16, alignItems: "center" }}>
      {/* Lid */}
      <View
        style={{
          width: 16,
          height: 2,
          borderRadius: 1,
          backgroundColor: color,
        }}
      />
      {/* Body */}
      <View
        style={{
          width: 12,
          height: 10,
          marginTop: 1.5,
          borderLeftWidth: 1.5,
          borderRightWidth: 1.5,
          borderBottomWidth: 1.5,
          borderColor: color,
          borderBottomLeftRadius: 2,
          borderBottomRightRadius: 2,
        }}
      />
    </View>
  );
}

function SearchIcon({ size = 18, color = "#FFFFFF" }: { size?: number; color?: string }) {
  const ring = size * 0.6;
  const stroke = size * 0.12;
  return (
    <View style={{ width: size, height: size }}>
      {/* Lens ring */}
      <View
        style={{
          width: ring,
          height: ring,
          borderRadius: ring / 2,
          borderWidth: stroke,
          borderColor: color,
          position: "absolute",
          top: 0,
          left: 0,
        }}
      />
      {/* Handle */}
      <View
        style={{
          width: stroke,
          height: size * 0.35,
          backgroundColor: color,
          borderRadius: stroke / 2,
          position: "absolute",
          bottom: 0,
          right: size * 0.08,
          transform: [{ rotate: "-45deg" }],
        }}
      />
    </View>
  );
}

function RefreshCycleIcon({ size = 18, color = "#FFFFFF" }: { size?: number; color?: string }) {
  const stroke = size * 0.12;
  const arcSize = size * 0.75;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {/* Top-right arc -- quarter border with arrow tip */}
      <View
        style={{
          width: arcSize,
          height: arcSize,
          borderRadius: arcSize / 2,
          borderWidth: stroke,
          borderColor: "transparent",
          borderTopColor: color,
          borderRightColor: color,
          position: "absolute",
        }}
      />
      {/* Top-right arrowhead */}
      <View
        style={{
          position: "absolute",
          top: size * 0.06,
          right: size * 0.06,
          width: 0,
          height: 0,
          borderLeftWidth: size * 0.15,
          borderRightWidth: size * 0.15,
          borderBottomWidth: size * 0.2,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderBottomColor: color,
          transform: [{ rotate: "45deg" }],
        }}
      />
      {/* Bottom-left arc */}
      <View
        style={{
          width: arcSize,
          height: arcSize,
          borderRadius: arcSize / 2,
          borderWidth: stroke,
          borderColor: "transparent",
          borderBottomColor: color,
          borderLeftColor: color,
          position: "absolute",
        }}
      />
      {/* Bottom-left arrowhead */}
      <View
        style={{
          position: "absolute",
          bottom: size * 0.06,
          left: size * 0.06,
          width: 0,
          height: 0,
          borderLeftWidth: size * 0.15,
          borderRightWidth: size * 0.15,
          borderTopWidth: size * 0.2,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderTopColor: color,
          transform: [{ rotate: "45deg" }],
        }}
      />
    </View>
  );
}

function CheckIcon({ size = 18, color = "#FFFFFF" }: { size?: number; color?: string }) {
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          width: size * 0.55,
          height: size * 0.3,
          borderLeftWidth: size * 0.13,
          borderBottomWidth: size * 0.13,
          borderColor: color,
          transform: [{ rotate: "-45deg" }],
          marginTop: -(size * 0.08),
          marginLeft: -(size * 0.04),
        }}
      />
    </View>
  );
}

/** Three-dot overflow icon */
function OverflowIcon({ color = "#94A3B8" }: { color?: string }) {
  const dot = { width: 3.5, height: 3.5, borderRadius: 1.75, backgroundColor: color };
  return (
    <View style={{ width: 20, height: 20, alignItems: "center", justifyContent: "center", gap: 2.5 }}>
      <View style={dot} />
      <View style={dot} />
      <View style={dot} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Tracking cost calculator (mirrors backend creditService tiers)
// ---------------------------------------------------------------------------

const TRACKING_TIERS: [number, number][] = [
  [10, 25],
  [20, 35],
  [50, 55],
  [100, 85],
  [150, 120],
  [200, 175],
];

function computeTrackingCredits(comboCount: number, trackingDays: number): number {
  let base14 = TRACKING_TIERS[TRACKING_TIERS.length - 1][1];
  for (const [maxCombos, credits] of TRACKING_TIERS) {
    if (comboCount <= maxCombos) {
      base14 = credits;
      break;
    }
  }
  return Math.ceil(base14 * (trackingDays / 14));
}

// ---------------------------------------------------------------------------
// Sticky header constants
// ---------------------------------------------------------------------------

const AUTO_REFRESH_THRESHOLD_MS = 8 * 60 * 60 * 1000; // 8 hours
const STICKY_HEADER_HEIGHT = 48;
// Scroll range over which the header fades/slides in (px)
const STICKY_FADE_RANGE = 40;

// ---------------------------------------------------------------------------
// Tracking duration presets
// ---------------------------------------------------------------------------

const TRACKING_PRESETS = [
  { label: "7d", days: 7 },
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
] as const;

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function SearchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState<SavedSearch | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingFilter, setUpdatingFilter] = useState(false);
  // Floating Layers: only one strip expanded at a time (-1 = none)
  const [expandedIndex, setExpandedIndex] = useState(-1);

  // -- Overflow menu --
  const [overflowVisible, setOverflowVisible] = useState(false);

  // -- Airline filter expansion --
  const [airlinesExpanded, setAirlinesExpanded] = useState(false);

  // -- Inline tracking activation --
  const [trackingExpanded, setTrackingExpanded] = useState(false);
  const [selectedTrackingDays, setSelectedTrackingDays] = useState(14);
  const [activatingTracking, setActivatingTracking] = useState(false);

  // -- Refresh button: cooldown & loading phase --
  const COOLDOWN_SECONDS = 120; // 2 minutes
  const [cooldownLeft, setCooldownLeft] = useState(0); // seconds remaining
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [refreshPhase, setRefreshPhase] = useState(0); // 0 = not loading
  const refreshPhaseRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Start cooldown countdown
  const startCooldown = useCallback(() => {
    setCooldownLeft(COOLDOWN_SECONDS);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldownLeft((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Clean up cooldown interval on unmount
  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
      if (refreshPhaseRef.current) clearTimeout(refreshPhaseRef.current);
    };
  }, []);

  // Multi-phase loading text: phase 1 (0-2s), phase 2 (2-4s), phase 3 (4s+)
  const startLoadingPhases = useCallback(() => {
    setRefreshPhase(1);
    const t1 = setTimeout(() => setRefreshPhase(2), 2000);
    const t2 = setTimeout(() => setRefreshPhase(3), 4000);
    // Store the last timeout for cleanup
    refreshPhaseRef.current = t2;
    // Return cleanup function
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // Format cooldown as "Xm Xs"
  const formatCooldown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  // -- Sticky header scroll tracking --
  const scrollY = useRef(new Animated.Value(0)).current;
  // Height of the hero section -- measured via onLayout
  const [heroHeight, setHeroHeight] = useState(0);
  const heroMeasured = heroHeight > 0;
  // JS-side boolean: enables touch events on sticky header only when visible.
  // (opacity: 0 via native driver does not disable touches in RN)
  const [stickyVisible, setStickyVisible] = useState(false);

  useEffect(() => {
    if (!heroMeasured) return;
    const threshold = Math.max(heroHeight - 20, 0);
    const listenerId = scrollY.addListener(({ value }) => {
      const shouldShow = value > threshold;
      setStickyVisible((prev) => (prev !== shouldShow ? shouldShow : prev));
    });
    return () => scrollY.removeListener(listenerId);
  }, [heroMeasured, heroHeight, scrollY]);

  const fetchSearch = async () => {
    try {
      const res = await api.get(`/search/${id}`);
      const data = res.data as SavedSearch;
      setSearch(data);

      // Check if round-trip data needs return-leg hydration (cron data)
      const isRoundTrip = data.tripType === "roundtrip";
      const hasResults = Array.isArray(data.latestResults) && data.latestResults.length > 0;
      const needsHydration = isRoundTrip && hasResults &&
        !('return' in (data.latestResults[0] as any));

      if (data.lastCheckedAt && data.trackingPaid) {
        const age = Date.now() - new Date(data.lastCheckedAt).getTime();
        const isStale = age > AUTO_REFRESH_THRESHOLD_MS;

        if (needsHydration && !isStale) {
          setRefreshing(true);
          try {
            const hydrateRes = await api.post(`/search/${id}/hydrate`);
            setSearch(hydrateRes.data);
          } catch {
            // Silently fail -- user still sees partial data with outbound + price
          } finally {
            setRefreshing(false);
          }
        } else if (isStale) {
          setRefreshing(true);
          const cleanupPhases = startLoadingPhases();
          try {
            const refreshRes = await api.post(`/search/${id}/refresh`);
            setSearch(refreshRes.data);
            startCooldown();
          } catch {
            // Silently fail -- user still sees cached data
          } finally {
            setRefreshing(false);
            setRefreshPhase(0);
            cleanupPhases();
          }
        }
      } else if (needsHydration && data.trackingPaid) {
        setRefreshing(true);
        try {
          const hydrateRes = await api.post(`/search/${id}/hydrate`);
          setSearch(hydrateRes.data);
        } catch {
          // Silently fail
        } finally {
          setRefreshing(false);
        }
      }
      // If !trackingPaid: show cached snapshot, no auto-refresh
    } catch {
      Alert.alert("Error", "Failed to load search details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSearch();
  }, [id]);

  const handleDelete = () => {
    setOverflowVisible(false);
    Alert.alert("Delete Search", "Are you sure you want to delete this search?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/search/${id}`);
            router.back();
          } catch {
            Alert.alert("Error", "Failed to delete search");
          }
        },
      },
    ]);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    const cleanupPhases = startLoadingPhases();
    try {
      const res = await api.post(`/search/${id}/refresh`);
      setSearch(res.data);
      startCooldown();
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 402) {
        Alert.alert(
          "Tracking Required",
          "Activate price tracking to refresh prices.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Activate",
              onPress: () => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setTrackingExpanded(true);
              },
            },
          ]
        );
      } else if (status === 429) {
        Alert.alert("Too Soon", err.response?.data?.error ?? "Please wait before refreshing again.");
      } else {
        Alert.alert("Error", "Failed to update search results");
      }
    } finally {
      setRefreshing(false);
      setRefreshPhase(0);
      cleanupPhases();
    }
  };

  const handleActivateTracking = async (days: number) => {
    setActivatingTracking(true);
    try {
      await api.post(`/search/${id}/activate-tracking`, {
        trackingDays: days,
      });
      setSearch((prev) =>
        prev ? { ...prev, trackingPaid: true, active: true } : prev
      );
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setTrackingExpanded(false);
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.error ?? "Failed to activate tracking");
    } finally {
      setActivatingTracking(false);
    }
  };

  // Tap-to-hydrate: fetch return leg for a single unhydrated combo
  const [hydratingIndex, setHydratingIndex] = useState(-1);

  const handleHydrateOne = async (optionIndex: number) => {
    setHydratingIndex(optionIndex);
    try {
      const res = await api.post(`/search/${id}/hydrate-one`, { optionIndex });
      setSearch((prev) => {
        if (!prev) return prev;
        const updated = [...prev.latestResults];
        updated[optionIndex] = res.data.combo;
        return { ...prev, latestResults: updated };
      });
    } catch {
      Alert.alert("Error", "Failed to load return flight details");
    } finally {
      setHydratingIndex(-1);
    }
  };

  const handleAirlineToggle = async (airline: string) => {
    if (!search || updatingFilter) return;

    const current = search.filters?.airlines ?? [];
    let updated: string[];

    if (current.length === 0) {
      // No filter active (all shown) -- exclude the tapped airline
      updated = search.availableAirlines.filter((a) => a !== airline);
    } else if (current.includes(airline)) {
      updated = current.filter((a) => a !== airline);
    } else {
      updated = [...current, airline];
    }

    // If all airlines selected or none left, clear filter
    const newFilters =
      updated.length === 0 || updated.length === search.availableAirlines.length
        ? { airlines: [] as string[] }
        : { airlines: updated };

    setUpdatingFilter(true);
    try {
      const res = await api.patch(`/search/${id}/filters`, {
        filters: newFilters,
      });
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSearch(res.data);
    } catch {
      Alert.alert("Error", "Failed to update filter");
    } finally {
      setUpdatingFilter(false);
    }
  };

  /** Reset all airline filters to show all */
  const handleClearFilters = async () => {
    if (!search || updatingFilter) return;
    setUpdatingFilter(true);
    try {
      const res = await api.patch(`/search/${id}/filters`, {
        filters: { airlines: [] },
      });
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSearch(res.data);
    } catch {
      Alert.alert("Error", "Failed to update filter");
    } finally {
      setUpdatingFilter(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

  const isOneWay = search?.tripType === "oneway";

  // Compute days until departure for "Until dep" chip label
  const daysUntilDeparture = useMemo(() => {
    if (!search) return 0;
    const dep = new Date(search.dateFrom + "T00:00:00").getTime();
    return Math.max(1, Math.ceil((dep - Date.now()) / 86_400_000));
  }, [search?.dateFrom]);

  // ------------------------------------------------------------------
  // Header -- hero section with editorial typography
  // ------------------------------------------------------------------

  const onHeroLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && h !== heroHeight) setHeroHeight(h);
  }, [heroHeight]);

  const listHeader = useMemo(() => {
    if (!search) return null;

    // -- Action line state logic --
    const isFirstTime = !search.lastCheckedAt && search.latestResults.length === 0;
    const isCoolingDown = cooldownLeft > 0 && !refreshing;
    const isUnpaid = !search.trackingPaid;

    return (
    <>
      {/* Measurable hero zone: nav + editorial price + route + action line */}
      <View onLayout={onHeroLayout}>

        {/* ---- Nav row: back + overflow ---- */}
        <View style={styles.navRow}>
          <BackButton />
          <Pressable
            onPress={() => setOverflowVisible(true)}
            hitSlop={10}
            style={({ pressed }) => [
              styles.overflowBtn,
              pressed && styles.overflowBtnPressed,
            ]}
          >
            <OverflowIcon color="#64748B" />
          </Pressable>
        </View>

        {/* ---- Route hero ---- */}
        <View style={styles.routeHero}>
          <Text style={styles.routeCode}>{search.origin}</Text>
          <View style={styles.routeArrowWrap}>
            <View style={styles.routeArrowLine} />
            <View style={styles.routeArrowHead} />
          </View>
          <Text style={styles.routeCode}>{search.destination}</Text>
        </View>

        {/* ---- Price hero ---- */}
        <View style={styles.priceRow}>
          {search.cheapestPrice != null ? (
            <Text style={styles.priceHero}>${search.cheapestPrice}</Text>
          ) : (
            <Text style={styles.priceHeroEmpty}>{"\u2014"}</Text>
          )}
        </View>

        {/* ---- Meta line: dates, nights, trip type ---- */}
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            {formatDate(search.dateFrom)} {"\u2014"} {formatDate(search.dateTo)}
          </Text>
          {!isOneWay && search.minNights != null && (
            <>
              <View style={styles.metaDot} />
              <Text style={styles.metaText}>
                {search.minNights}–{search.maxNights} nights
              </Text>
            </>
          )}
          <View style={styles.metaDot} />
          <Text style={styles.metaText}>
            {isOneWay ? "one way" : "round trip"}
          </Text>
        </View>

        {/* ---- Updated timestamp ---- */}
        {search.lastCheckedAt && !refreshing && (
          <Text style={styles.updatedTimestamp}>
            Updated {timeAgo(search.lastCheckedAt)}
          </Text>
        )}

        {/* ---- Action line ---- */}
        <View style={styles.actionLine}>
          {refreshing ? (
            <View style={styles.actionLineRow}>
              <ActivityIndicator size="small" color="#2F9CF4" />
              <Text style={styles.actionLineRefreshing}>
                {refreshPhase <= 1
                  ? "Searching flights..."
                  : refreshPhase === 2
                  ? "Comparing prices..."
                  : "Almost done..."}
              </Text>
            </View>
          ) : isCoolingDown ? (
            <View style={styles.actionLineRow}>
              <CheckIcon size={12} color="#94A3B8" />
              <Text style={styles.actionLineMuted}>
                Prices up to date
              </Text>
              <View style={styles.actionDot} />
              <Text style={styles.actionLineMuted}>
                {formatCooldown(cooldownLeft)}
              </Text>
            </View>
          ) : isFirstTime ? (
            <Pressable
              onPress={handleRefresh}
              style={({ pressed }) => pressed && styles.actionLinePressed}
            >
              <View style={styles.actionLineRow}>
                <SearchIcon size={13} color="#2F9CF4" />
                <Text style={styles.actionLineTappable}>
                  Search for flights
                </Text>
                <ArrowIcon size={10} color="#2F9CF4" />
              </View>
            </Pressable>
          ) : isUnpaid ? (
            <Pressable
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setTrackingExpanded((prev) => !prev);
              }}
              style={({ pressed }) => [
                styles.trackPriceBtn,
                pressed && styles.trackPriceBtnPressed,
              ]}
            >
              <RefreshCycleIcon size={16} color="#F59E0B" />
              <Text style={styles.trackPriceBtnText}>
                Track price changes
              </Text>
              <ArrowIcon size={10} color="#F59E0B" />
            </Pressable>
          ) : (
            <Pressable
              onPress={handleRefresh}
              style={({ pressed }) => pressed && styles.actionLinePressed}
            >
              <View style={styles.actionLineRow}>
                <Text style={styles.actionLineTappable}>
                  Check prices
                </Text>
                <ArrowIcon size={10} color="#2F9CF4" />
              </View>
            </Pressable>
          )}
        </View>

        {/* ---- Inline tracking activation expansion ---- */}
        {trackingExpanded && !search.trackingPaid && (
          <View style={styles.trackingExpansion}>
            <Text style={styles.trackingLabel}>
              How long should we watch this route?
            </Text>
            <View style={styles.trackingChipsRow}>
              {TRACKING_PRESETS.map((preset) => {
                const credits = computeTrackingCredits(
                  search.comboCount ?? search.latestResults.length,
                  preset.days
                );
                const isSelected = selectedTrackingDays === preset.days;
                return (
                  <Pressable
                    key={preset.days}
                    onPress={() => setSelectedTrackingDays(preset.days)}
                    style={[
                      styles.trackingChip,
                      isSelected && styles.trackingChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.trackingChipText,
                        isSelected && styles.trackingChipTextActive,
                      ]}
                    >
                      {preset.label}
                    </Text>
                    <Text
                      style={[
                        styles.trackingChipCredits,
                        isSelected && styles.trackingChipCreditsActive,
                      ]}
                    >
                      {credits} cr
                    </Text>
                  </Pressable>
                );
              })}
              {/* "Until dep" chip */}
              {(() => {
                const depCredits = computeTrackingCredits(
                  search.comboCount ?? search.latestResults.length,
                  daysUntilDeparture
                );
                const isSelected = selectedTrackingDays === 0;
                return (
                  <Pressable
                    onPress={() => setSelectedTrackingDays(0)}
                    style={[
                      styles.trackingChip,
                      isSelected && styles.trackingChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.trackingChipText,
                        isSelected && styles.trackingChipTextActive,
                      ]}
                    >
                      Until dep ({daysUntilDeparture}d)
                    </Text>
                    <Text
                      style={[
                        styles.trackingChipCredits,
                        isSelected && styles.trackingChipCreditsActive,
                      ]}
                    >
                      {depCredits} cr
                    </Text>
                  </Pressable>
                );
              })()}
            </View>
            <View style={styles.trackingActions}>
              <Pressable
                onPress={() => handleActivateTracking(selectedTrackingDays)}
                disabled={activatingTracking}
                style={({ pressed }) => [
                  styles.activateBtn,
                  pressed && styles.activateBtnPressed,
                  activatingTracking && styles.activateBtnDisabled,
                ]}
              >
                {activatingTracking ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.activateBtnText}>Start tracking</Text>
                )}
              </Pressable>
              <Pressable
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setTrackingExpanded(false);
                }}
                hitSlop={8}
              >
                <Text style={styles.trackingDismiss}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Bottom spacer before results */}
        <View style={styles.heroSpacer} />
      </View>{/* end hero measurement zone */}

      {/* ---- Hairline divider before results ---- */}
      <View style={styles.sectionDivider} />
    </>
    );
  }, [search, refreshing, onHeroLayout, cooldownLeft, refreshPhase, trackingExpanded, selectedTrackingDays, activatingTracking, daysUntilDeparture]);

  // Native-driven scroll handler for 60fps animation
  const onScroll = useMemo(
    () =>
      Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: true }
      ),
    [scrollY]
  );

  const listContentStyle = useMemo(
    () => [styles.listContent, { paddingTop: insets.top }],
    [insets.top]
  );

  // ------------------------------------------------------------------
  // Airline filter counts
  // ------------------------------------------------------------------

  const activeFilterCount = search?.filters?.airlines?.length ?? 0;
  const totalAirlines = search?.availableAirlines?.length ?? 0;
  const hasActiveFilter = activeFilterCount > 0 && activeFilterCount < totalAirlines;

  // ------------------------------------------------------------------
  // Loading state
  // ------------------------------------------------------------------

  if (loading) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <MeshBackground />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2F9CF4" />
        </View>
      </View>
    );
  }

  if (!search) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <MeshBackground />
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Search not found</Text>
        </View>
      </View>
    );
  }

  // ------------------------------------------------------------------
  // Sticky header animation values
  // ------------------------------------------------------------------

  const triggerOffset = Math.max(heroHeight - 20, 0);

  const stickyOpacity = heroMeasured
    ? scrollY.interpolate({
        inputRange: [triggerOffset, triggerOffset + STICKY_FADE_RANGE],
        outputRange: [0, 1],
        extrapolate: "clamp",
      })
    : 0;

  const stickyTranslateY = heroMeasured
    ? scrollY.interpolate({
        inputRange: [triggerOffset, triggerOffset + STICKY_FADE_RANGE],
        outputRange: [-8, 0],
        extrapolate: "clamp",
      })
    : -8;

  // ------------------------------------------------------------------
  // Sticky header overlay
  // ------------------------------------------------------------------

  const stickyHeaderOverlay = search ? (
    <>
      {/* Safe-area band behind notch/status bar */}
      <Animated.View
        style={[
          stickyStyles.safeAreaBand,
          { height: insets.top, opacity: stickyOpacity },
        ]}
        pointerEvents="none"
      />

      {/* Sticky header bar -- compact single line */}
      <Animated.View
        style={[
          stickyStyles.container,
          {
            top: insets.top,
            opacity: stickyOpacity,
            transform: [{ translateY: stickyTranslateY }],
          },
        ]}
        pointerEvents={stickyVisible ? "auto" : "none"}
      >
        <View style={stickyStyles.inner}>
          {/* Back chevron */}
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => [
              stickyStyles.backBtn,
              pressed && stickyStyles.backBtnPressed,
            ]}
          >
            <View style={stickyStyles.backChevron} />
          </Pressable>

          {/* Center: route + price + date in one line */}
          <View style={stickyStyles.center}>
            <Text style={stickyStyles.summaryText} numberOfLines={1}>
              {search.origin}
              {" "}
              <Text style={stickyStyles.summaryMuted}>{"\u2192"}</Text>
              {" "}
              {search.destination}
              {search.cheapestPrice != null && (
                <>
                  {"  "}
                  <Text style={stickyStyles.summaryMuted}>{"\u00B7"}</Text>
                  {"  "}
                  <Text style={stickyStyles.summaryPrice}>${search.cheapestPrice}</Text>
                </>
              )}
              {"  "}
              <Text style={stickyStyles.summaryMuted}>{"\u00B7"}</Text>
              {"  "}
              <Text style={stickyStyles.summaryMuted}>{formatDate(search.dateFrom)}</Text>
            </Text>
          </View>

          {/* Overflow menu */}
          <Pressable
            onPress={() => setOverflowVisible(true)}
            hitSlop={10}
            style={({ pressed }) => [
              stickyStyles.overflowBtn,
              pressed && stickyStyles.overflowBtnPressed,
            ]}
          >
            <OverflowIcon color="#94A3B8" />
          </Pressable>
        </View>

        <View style={stickyStyles.borderLine} />
      </Animated.View>
    </>
  ) : null;

  // ------------------------------------------------------------------
  // Overflow menu modal
  // ------------------------------------------------------------------

  const overflowMenu = (
    <Modal
      visible={overflowVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setOverflowVisible(false)}
    >
      <Pressable
        style={styles.overflowBackdrop}
        onPress={() => setOverflowVisible(false)}
      >
        <View style={[styles.overflowMenu, { top: insets.top + 52 }]}>
          <Pressable
            onPress={handleDelete}
            style={({ pressed }) => [
              styles.overflowMenuItem,
              pressed && styles.overflowMenuItemPressed,
            ]}
          >
            <TrashIcon color="#EF4444" />
            <Text style={styles.overflowMenuItemText}>Delete search</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );


  // ------------------------------------------------------------------
  // Empty results
  // ------------------------------------------------------------------

  if (search.latestResults.length === 0) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <MeshBackground />
        <View style={styles.safeArea}>
          <Animated.ScrollView
            contentContainerStyle={listContentStyle}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={onScroll}
          >
            {listHeader}
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconCircle}>
                <View style={styles.emptyDash} />
                <View style={[styles.emptyDash, styles.emptyDashShort]} />
              </View>
              <Text style={styles.emptyTitle}>No results yet</Text>
              <Text style={styles.emptySubtitle}>
                Tap "Search for flights" above to find the best prices
              </Text>
            </View>
          </Animated.ScrollView>
        </View>
        {stickyHeaderOverlay}
        {overflowMenu}
      </View>
    );
  }

  // ------------------------------------------------------------------
  // Main render
  // ------------------------------------------------------------------

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <MeshBackground />
      <View style={styles.safeArea}>
        <Animated.ScrollView
          contentContainerStyle={listContentStyle}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={onScroll}
        >
          {listHeader}
          <FloatingLayersContainer>
            {/* Results count + collapsible airline filter */}
            {search.latestResults.length > 0 && (
              <View style={styles.slabHeader}>
                <View style={styles.slabTopRow}>
                  <Text style={styles.slabResultsLabel}>
                    {hasActiveFilter
                      ? `${search.latestResults.length} of ${search.comboCount ?? "?"} results`
                      : `${search.latestResults.length} result${search.latestResults.length !== 1 ? "s" : ""}`}
                  </Text>
                  {updatingFilter && (
                    <ActivityIndicator size="small" color="#2F9CF4" />
                  )}
                  {totalAirlines > 1 && (
                    <Pressable
                      onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setAirlinesExpanded((prev) => !prev);
                      }}
                      hitSlop={8}
                      style={({ pressed }) => [
                        styles.filterToggle,
                        pressed && { opacity: 0.6 },
                      ]}
                    >
                      <Text style={styles.filterToggleText}>
                        {hasActiveFilter
                          ? `Airlines (${activeFilterCount}/${totalAirlines})`
                          : "Airlines"}
                      </Text>
                      <View
                        style={[
                          styles.filterChevron,
                          airlinesExpanded && styles.filterChevronUp,
                        ]}
                      />
                    </Pressable>
                  )}
                </View>
                {airlinesExpanded && totalAirlines > 1 && (
                  <View style={styles.airlineChipsRow}>
                    {search.availableAirlines.map((airline) => {
                      const activeFilter = search.filters?.airlines ?? [];
                      const isActive =
                        activeFilter.length === 0 || activeFilter.includes(airline);
                      const logoUrl = search.airlineLogos?.[airline];
                      return (
                        <Pressable
                          key={airline}
                          onPress={() => handleAirlineToggle(airline)}
                          disabled={updatingFilter}
                          style={({ pressed }) => [
                            styles.airlineChip,
                            !isActive && styles.airlineChipInactive,
                            pressed && styles.airlineChipPressed,
                          ]}
                        >
                          <AirlineLogo airline={airline} logoUrl={logoUrl} size={16} />
                          <Text
                            style={[
                              styles.airlineChipText,
                              !isActive && styles.airlineChipTextInactive,
                            ]}
                          >
                            {airline}
                          </Text>
                        </Pressable>
                      );
                    })}
                    {hasActiveFilter && (
                      <Pressable
                        onPress={handleClearFilters}
                        disabled={updatingFilter}
                        hitSlop={8}
                      >
                        <Text style={styles.clearFilterText}>Show all</Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Flight strips */}
            {isOneWay
              ? (search.latestResults as FlightLeg[]).map((item, index) => (
                  <OneWayStrip
                    key={index}
                    item={item}
                    index={index}
                    origin={search.origin}
                    destination={search.destination}
                    isCheapest={index === 0}
                    isExpanded={expandedIndex === index}
                    onToggle={() =>
                      setExpandedIndex((prev) => (prev === index ? -1 : index))
                    }
                    airlineLogos={search.airlineLogos}
                  />
                ))
              : (search.latestResults as Combo[]).map((item, index) => (
                  <RoundTripStrip
                    key={index}
                    item={item}
                    index={index}
                    origin={search.origin}
                    destination={search.destination}
                    isCheapest={index === 0}
                    isExpanded={expandedIndex === index}
                    onToggle={() =>
                      setExpandedIndex((prev) => (prev === index ? -1 : index))
                    }
                    airlineLogos={search.airlineLogos}
                    onHydrate={handleHydrateOne}
                    isHydrating={hydratingIndex === index}
                  />
                ))}
          </FloatingLayersContainer>
        </Animated.ScrollView>
      </View>
      {stickyHeaderOverlay}
      {overflowMenu}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Sticky header styles
// ---------------------------------------------------------------------------

const stickyStyles = StyleSheet.create({
  safeAreaBand: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FAFCFF",
    zIndex: 101,
  },
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    height: STICKY_HEADER_HEIGHT,
    backgroundColor: "#FAFCFF",
    zIndex: 100,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 3,
  },
  inner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  borderLine: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E2E8F0",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnPressed: {
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  backChevron: {
    width: 9,
    height: 9,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: "#0F172A",
    transform: [{ rotate: "45deg" }],
    marginLeft: 3,
  },
  center: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  summaryText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  summaryMuted: {
    fontFamily: fonts.regular,
    color: "#94A3B8",
  },
  summaryPrice: {
    fontFamily: fonts.bold,
    color: "#0F172A",
  },
  overflowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  overflowBtnPressed: {
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
});

// ---------------------------------------------------------------------------
// Main styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#EEF4FF",
  },
  safeArea: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // ---- Nav row ----
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    marginBottom: 12,
  },
  overflowBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.6)",
  },
  overflowBtnPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    transform: [{ scale: 0.95 }],
  },

  // ---- Route hero (type.heading1: 24px ExtraBold) ----

  routeHero: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  routeCode: {
    fontFamily: fonts.extraBold,
    fontSize: 28,
    color: "#0F172A",
    letterSpacing: -0.8,
    lineHeight: 32,
  },
  routeArrowWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
  },
  routeArrowLine: {
    width: 32,
    height: 1.5,
    backgroundColor: "#CBD5E1",
  },
  routeArrowHead: {
    width: 7,
    height: 7,
    borderRightWidth: 1.5,
    borderTopWidth: 1.5,
    borderColor: "#CBD5E1",
    transform: [{ rotate: "45deg" }],
    marginLeft: -4,
  },

  // ---- Price hero (type.hero: 36px ExtraBold) ----

  priceRow: {
    alignItems: "center",
    marginBottom: 8,
  },
  priceHero: {
    fontFamily: fonts.extraBold,
    fontSize: 42,
    color: "#0F172A",
    letterSpacing: -1.5,
    lineHeight: 46,
  },
  priceHeroEmpty: {
    fontFamily: fonts.extraBold,
    fontSize: 42,
    color: "#CBD5E1",
    letterSpacing: -1.5,
    lineHeight: 46,
  },

  // ---- Meta row (single line below price) ----

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  metaText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: "#64748B",
    letterSpacing: 0.1,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#CBD5E1",
    marginHorizontal: 8,
  },

  // ---- Updated timestamp (type.micro) ----
  updatedTimestamp: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: "#94A3B8",
    letterSpacing: -0.1,
    lineHeight: 16,
    marginBottom: 4,
    textAlign: "center",
  },

  // ---- Action line: single compact tappable row ----

  actionLine: {
    marginBottom: 4,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  actionLineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionLinePressed: {
    opacity: 0.6,
  },
  actionLineMuted: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: "#94A3B8",
    letterSpacing: -0.1,
  },
  actionLineTappable: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: "#2F9CF4",
  },
  actionLineAmber: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: "#F59E0B",
  },

  // ---- Track price CTA button (warm accent, inviting) ----

  trackPriceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.2)",
    minHeight: 44,
  },
  trackPriceBtnPressed: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    transform: [{ scale: 0.97 }],
  },
  trackPriceBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: "#D97706",
    flex: 1,
  },
  actionLineRefreshing: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: "#1A7ED4",
  },
  actionDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#CBD5E1",
  },

  // ---- Inline tracking activation expansion ----

  trackingExpansion: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(148, 163, 184, 0.2)",
    alignItems: "center",
  },
  trackingLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: "#0F172A",
    letterSpacing: 0.1,
    marginBottom: 12,
    textAlign: "center",
  },
  trackingChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  trackingChip: {
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(148, 163, 184, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.15)",
    gap: 2,
  },
  trackingChipActive: {
    backgroundColor: "rgba(47, 156, 244, 0.1)",
    borderColor: "rgba(47, 156, 244, 0.3)",
  },
  trackingChipText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: "#94A3B8",
  },
  trackingChipTextActive: {
    color: "#2F9CF4",
    fontFamily: fonts.semiBold,
  },
  trackingChipCredits: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: "#94A3B8",
    letterSpacing: 0.1,
  },
  trackingChipCreditsActive: {
    color: "#2F9CF4",
  },
  trackingActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  activateBtn: {
    backgroundColor: "#2F9CF4",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  activateBtnPressed: {
    backgroundColor: "#1A7ED4",
    transform: [{ scale: 0.97 }],
  },
  activateBtnDisabled: {
    opacity: 0.6,
  },
  activateBtnText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: "#FFFFFF",
    letterSpacing: 0.1,
  },
  trackingDismiss: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: "#94A3B8",
  },

  // ---- Hero spacer ----
  heroSpacer: {
    height: 16,
  },

  // ---- Section divider ----
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E2E8F0",
    marginHorizontal: -20, // edge-to-edge
    marginBottom: 0,
  },

  // ---- Slab header: results count + inline airline chips ----
  slabHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  slabTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  slabResultsLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: "#64748B",
    letterSpacing: 0.2,
    flex: 1,
  },
  filterToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: "rgba(148, 163, 184, 0.08)",
  },
  filterToggleText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: "#64748B",
  },
  filterChevron: {
    width: 6,
    height: 6,
    borderRightWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: "#64748B",
    transform: [{ rotate: "45deg" }],
    marginTop: -2,
  },
  filterChevronUp: {
    transform: [{ rotate: "-135deg" }],
    marginTop: 2,
  },
  clearFilterText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: "#2F9CF4",
    paddingVertical: 7,
  },
  airlineChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  airlineChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: "rgba(47, 156, 244, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(47, 156, 244, 0.15)",
  },
  airlineChipInactive: {
    backgroundColor: "rgba(148, 163, 184, 0.06)",
    borderColor: "rgba(148, 163, 184, 0.15)",
    opacity: 0.5,
  },
  airlineChipPressed: {
    transform: [{ scale: 0.96 }],
  },
  airlineChipText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: "#1A7ED4",
    letterSpacing: -0.1,
  },
  airlineChipTextInactive: {
    color: "#94A3B8",
    fontFamily: fonts.medium,
  },

  // ---- Overflow menu ----
  overflowBackdrop: {
    flex: 1,
  },
  overflowMenu: {
    position: "absolute",
    right: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 4,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    minWidth: 180,
  },
  overflowMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    // 44pt minimum touch target per iOS HIG
    minHeight: 44,
  },
  overflowMenuItemPressed: {
    backgroundColor: "rgba(239, 68, 68, 0.06)",
  },
  overflowMenuItemText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: "#EF4444",
  },

  // ---- Empty state ----
  emptyWrap: {
    alignItems: "center",
    paddingTop: 48,
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(219, 234, 254, 0.7)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
  emptyDash: {
    width: 24,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#93C5FD",
    marginVertical: 3,
  },
  emptyDashShort: {
    width: 16,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: "#0F172A",
    marginBottom: 6,
    textAlign: "center",
  },
  emptySubtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
  emptyText: {
    fontFamily: fonts.regular,
    color: "#94A3B8",
    fontSize: 16,
    textAlign: "center",
    marginTop: 48,
    paddingHorizontal: 20,
  },
});
