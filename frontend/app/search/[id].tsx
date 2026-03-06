import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
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
import api from "../../src/api/client";
import {
  RoundTripStrip,
  OneWayStrip,
  FloatingLayersContainer,
} from "../../src/components/FlightStrip";
import BackButton from "../../src/components/BackButton";
import AirlineLogo from "../../src/components/AirlineLogo";
import { timeAgo } from "../../src/utils/time";
import { fonts } from "../../src/utils/fonts";

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

function ArrowIcon({ size = 14, color = "#3B82F6" }: { size?: number; color?: string }) {
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
    <View style={{ width: 14, height: 14, alignItems: "center" }}>
      {/* Lid */}
      <View
        style={{
          width: 14,
          height: 2,
          borderRadius: 1,
          backgroundColor: color,
        }}
      />
      {/* Body */}
      <View
        style={{
          width: 10,
          height: 9,
          marginTop: 1,
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

// ---------------------------------------------------------------------------
// Sticky header constants
// ---------------------------------------------------------------------------

const AUTO_REFRESH_THRESHOLD_MS = 8 * 60 * 60 * 1000; // 8 hours
const STICKY_HEADER_HEIGHT = 56;
// Scroll range over which the header fades/slides in (px)
const STICKY_FADE_RANGE = 40;

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
  // Height of the hero section (navRow + hero card) -- measured via onLayout
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
      // Only update state when the boolean actually changes
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
          // Data is recent but needs hydration — hydrate only (no full refresh)
          setRefreshing(true);
          try {
            const hydrateRes = await api.post(`/search/${id}/hydrate`);
            setSearch(hydrateRes.data);
          } catch {
            // Silently fail — user still sees partial data with outbound + price
          } finally {
            setRefreshing(false);
          }
        } else if (isStale) {
          // Data is stale — do a full refresh (returns hydrated data)
          setRefreshing(true);
          const cleanupPhases = startLoadingPhases();
          try {
            const refreshRes = await api.post(`/search/${id}/refresh`);
            setSearch(refreshRes.data);
            startCooldown();
          } catch {
            // Silently fail — user still sees cached data
          } finally {
            setRefreshing(false);
            setRefreshPhase(0);
            cleanupPhases();
          }
        }
      } else if (needsHydration && data.trackingPaid) {
        // No lastCheckedAt but needs hydration (edge case)
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
            { text: "Activate", onPress: handleActivateTracking },
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

  const handleActivateTracking = async () => {
    try {
      const res = await api.post(`/search/${id}/activate-tracking`);
      setSearch((prev) =>
        prev ? { ...prev, trackingPaid: true, active: true } : prev
      );
      Alert.alert(
        "Tracking Activated",
        "Price monitoring is now active. We'll check for price changes automatically."
      );
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.error ?? "Failed to activate tracking");
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

  const handleAirlineChipToggle = async (airline: string) => {
    if (!search || updatingFilter) return;

    const current = search.filters?.airlines ?? [];
    let updated: string[];

    if (current.length === 0) {
      // No filter active — user is selecting ONE airline (deselecting all others)
      updated = [airline];
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

  const formatDate = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

  const isOneWay = search?.tripType === "oneway";

  // ------------------------------------------------------------------
  // Header -- hero section with route, price, and actions
  // ------------------------------------------------------------------

  // Callback for measuring hero section height (navRow + hero card).
  // Used to determine the scroll threshold for showing the sticky header.
  const onHeroLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && h !== heroHeight) setHeroHeight(h);
  }, [heroHeight]);

  // Memoised as a JSX element so ScrollView keeps a stable reference and does
  // not unmount/remount the header on every state change.
  const listHeader = useMemo(() => {
    if (!search) return null;

    // -- Refresh bar state logic --
    const isFirstTime = !search.lastCheckedAt && search.latestResults.length === 0;
    const isCoolingDown = cooldownLeft > 0 && !refreshing;
    const isDisabled = refreshing || isCoolingDown;

    let bridgeLabel: string;
    let bridgeSub: string | null = null;
    let bridgeIcon: React.ReactNode;

    const isUnpaid = !search.trackingPaid;

    if (refreshing) {
      bridgeLabel =
        refreshPhase <= 1
          ? "Searching flights..."
          : refreshPhase === 2
          ? "Comparing prices..."
          : "Almost done...";
      bridgeSub = "This usually takes a few seconds";
      bridgeIcon = <ActivityIndicator size="small" color="#3B82F6" />;
    } else if (isUnpaid && !isFirstTime) {
      bridgeLabel = "Activate Price Tracking";
      bridgeSub = search.trackingFee != null
        ? `$${search.trackingFee.toFixed(2)} one-time`
        : "Get automatic price updates";
      bridgeIcon = <RefreshCycleIcon size={16} color="#F59E0B" />;
    } else if (isCoolingDown) {
      bridgeLabel = "Prices up to date";
      bridgeSub = `Check again in ${formatCooldown(cooldownLeft)}`;
      bridgeIcon = <CheckIcon size={16} color="#94A3B8" />;
    } else if (isFirstTime) {
      bridgeLabel = "Search for Flights";
      bridgeSub = "Scan Google Flights for the best prices";
      bridgeIcon = <SearchIcon size={16} color="#3B82F6" />;
    } else {
      bridgeLabel = "Check for New Prices";
      bridgeIcon = <RefreshCycleIcon size={16} color="#3B82F6" />;
    }

    return (
    <>
      {/* Measurable billboard zone: navRow + route + price */}
      <View onLayout={onHeroLayout}>
        {/* Nav row: back + delete */}
        <View style={styles.navRow}>
          <BackButton />
          <Pressable
            onPress={handleDelete}
            hitSlop={8}
            style={({ pressed }) => [
              styles.deleteBtn,
              pressed && styles.deleteBtnPressed,
            ]}
          >
            <TrashIcon color="#EF4444" />
            <Text style={styles.deleteLink}>Delete</Text>
          </Pressable>
        </View>

        {/* === BILLBOARD: raw typography on mesh, no container === */}

        {/* Route codes with connecting line */}
        <View style={styles.routeRow}>
          <Text style={styles.routeCode}>{search.origin}</Text>
          <View style={styles.routeArrowWrap}>
            <View style={styles.routeLine} />
            <View style={styles.routeArrowCircle}>
              {isOneWay ? (
                <ArrowIcon size={14} color="#3B82F6" />
              ) : (
                <View style={styles.roundTripArrows}>
                  <ArrowIcon size={11} color="#3B82F6" />
                  <View style={styles.returnArrow}>
                    <ArrowIcon size={11} color="#3B82F6" />
                  </View>
                </View>
              )}
            </View>
            <View style={styles.routeLine} />
          </View>
          <Text style={[styles.routeCode, styles.routeCodeRight]}>
            {search.destination}
          </Text>
        </View>

        {/* Trip type label */}
        <Text style={styles.tripTypeLabel}>
          {isOneWay ? "one way" : "round trip"}
        </Text>

        {/* Price -- the dominant element */}
        <View style={styles.priceZone}>
          {search.cheapestPrice != null ? (
            <Text style={styles.priceHeroValue}>
              ${search.cheapestPrice}
            </Text>
          ) : (
            <Text style={styles.priceHeroEmpty}>No data yet</Text>
          )}
          <Text style={styles.priceHeroLabel}>cheapest found</Text>
        </View>

        {/* Meta line: dates + nights */}
        <Text style={styles.metaLine}>
          {formatDate(search.dateFrom)} {"\u2014"} {formatDate(search.dateTo)}
          {!isOneWay && search.minNights != null
            ? `  \u00B7  ${search.minNights}\u2013${search.maxNights} nights`
            : ""}
        </Text>

        {/* Updated timestamp */}
        {search.lastCheckedAt && (
          <Text style={styles.updatedLabel}>
            Updated {timeAgo(search.lastCheckedAt)}
          </Text>
        )}

        {/* Spacer before slab */}
        <View style={styles.billboardSpacer} />
      </View>{/* end billboard measurement zone */}

      {/* === BRIDGE BAR: edge-to-edge tappable refresh bar === */}
      {/* This visually "caps" the top of the strip slab and serves as the
          transition from open billboard to dense data strips.
          It sits outside the FloatingLayersContainer but uses the same
          marginHorizontal: -20 trick to go edge-to-edge. */}
      <Pressable
        style={({ pressed }) => [
          styles.bridgeBar,
          isCoolingDown && styles.bridgeBarCooldown,
          refreshing && styles.bridgeBarLoading,
          pressed && !isDisabled && styles.bridgeBarPressed,
        ]}
        onPress={isUnpaid && !isFirstTime ? handleActivateTracking : handleRefresh}
        disabled={isDisabled && !isUnpaid}
      >
        <View style={styles.bridgeBarInner}>
          <View style={styles.bridgeBarLeft}>
            {bridgeIcon}
            <View style={styles.bridgeBarTextWrap}>
              <Text
                style={[
                  styles.bridgeBarLabel,
                  isCoolingDown && styles.bridgeBarLabelMuted,
                  refreshing && styles.bridgeBarLabelActive,
                ]}
              >
                {bridgeLabel}
              </Text>
              {bridgeSub && (
                <Text style={styles.bridgeBarSub}>{bridgeSub}</Text>
              )}
            </View>
          </View>
          {/* Right chevron hint (hidden during loading/cooldown) */}
          {!refreshing && !isCoolingDown && (
            <ArrowIcon size={12} color="#94A3B8" />
          )}
        </View>
      </Pressable>
    </>
    );
  }, [search, refreshing, onHeroLayout, cooldownLeft, refreshPhase]);

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
  // Loading state
  // ------------------------------------------------------------------

  if (loading) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <MeshBackground />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3B82F6" />
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

  // The scroll offset at which the hero is fully scrolled out of view.
  // We subtract a small amount so the header starts appearing just before
  // the hero fully disappears, creating a seamless hand-off.
  const triggerOffset = Math.max(heroHeight - 20, 0);

  // Opacity: 0 while hero is visible, fades to 1 over STICKY_FADE_RANGE px
  const stickyOpacity = heroMeasured
    ? scrollY.interpolate({
        inputRange: [triggerOffset, triggerOffset + STICKY_FADE_RANGE],
        outputRange: [0, 1],
        extrapolate: "clamp",
      })
    : 0;

  // Slide in from -8px to 0 over the same range
  const stickyTranslateY = heroMeasured
    ? scrollY.interpolate({
        inputRange: [triggerOffset, triggerOffset + STICKY_FADE_RANGE],
        outputRange: [-8, 0],
        extrapolate: "clamp",
      })
    : -8;

  // ------------------------------------------------------------------
  // Reusable sticky header overlay (rendered above the FlatList)
  // ------------------------------------------------------------------

  const stickyHeaderOverlay = search ? (
    <>
      {/* White safe-area inset band behind notch/status bar */}
      <Animated.View
        style={[
          stickyStyles.safeAreaBand,
          { height: insets.top, opacity: stickyOpacity },
        ]}
        pointerEvents="none"
      />

      {/* Sticky header bar */}
      <Animated.View
        style={[
          stickyStyles.container,
          {
            top: insets.top,
            opacity: stickyOpacity,
            transform: [{ translateY: stickyTranslateY }],
          },
        ]}
        // Disable touch events when header is invisible (opacity via native
        // driver does not disable touches -- we track visibility in JS)
        pointerEvents={stickyVisible ? "auto" : "none"}
      >
        <View style={stickyStyles.inner}>
          {/* Back chevron -- simple, no blur */}
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

          {/* Center: route + meta */}
          <View style={stickyStyles.center}>
            <View style={stickyStyles.routeRow}>
              <Text style={stickyStyles.routeCode}>{search.origin}</Text>
              <ArrowIcon size={12} color="#94A3B8" />
              <Text style={stickyStyles.routeCode}>{search.destination}</Text>
            </View>
            <Text style={stickyStyles.meta} numberOfLines={1}>
              {formatDate(search.dateFrom)} {"\u2014"} {formatDate(search.dateTo)}
              {search.cheapestPrice != null ? `  \u00B7  from $${search.cheapestPrice}` : ""}
            </Text>
          </View>

          {/* Right spacer to balance the back button for centered layout */}
          <View style={stickyStyles.rightSpacer} />
        </View>

        {/* Bottom border for visual separation */}
        <View style={stickyStyles.borderLine} />
      </Animated.View>
    </>
  ) : null;

  // ------------------------------------------------------------------
  // Empty results
  // ------------------------------------------------------------------

  if (search.latestResults.length === 0) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <MeshBackground />
        <View style={styles.safeArea}>
          <Animated.FlatList
            data={[]}
            keyExtractor={() => "empty"}
            ListHeaderComponent={listHeader}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <View style={styles.emptyIconCircle}>
                  <View style={styles.emptyDash} />
                  <View style={[styles.emptyDash, styles.emptyDashShort]} />
                </View>
                <Text style={styles.emptyTitle}>No results yet</Text>
                <Text style={styles.emptySubtitle}>
                  Tap "Search for Flights" above to find the best prices
                </Text>
              </View>
            }
            renderItem={() => null}
            contentContainerStyle={listContentStyle}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={onScroll}
          />
        </View>
        {stickyHeaderOverlay}
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
            {/* Results count + inline airline chip filter */}
            {search.latestResults.length > 0 && (
              <>
                <View style={styles.slabHeaderRow}>
                  <Text style={styles.slabResultsLabel}>
                    {search.latestResults.length} flight
                    {search.latestResults.length !== 1 ? "s" : ""} found
                  </Text>
                  {updatingFilter && (
                    <ActivityIndicator size="small" color="#3B82F6" />
                  )}
                </View>
                {(search.availableAirlines?.length ?? 0) > 1 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.chipRow}
                    contentContainerStyle={styles.chipScrollContent}
                  >
                    {search.availableAirlines.map((airline) => {
                      const activeFilter = search.filters?.airlines ?? [];
                      const isActive =
                        activeFilter.length === 0 || activeFilter.includes(airline);
                      const logoUrl = search.airlineLogos?.[airline];
                      return (
                        <Pressable
                          key={airline}
                          onPress={() => handleAirlineChipToggle(airline)}
                          disabled={updatingFilter || refreshing}
                          style={({ pressed }) => [
                            styles.chip,
                            isActive ? styles.chipActive : styles.chipInactive,
                            pressed && styles.chipPressed,
                          ]}
                        >
                          <AirlineLogo airline={airline} logoUrl={logoUrl} size={16} />
                          <Text
                            style={[
                              styles.chipText,
                              isActive
                                ? styles.chipTextActive
                                : styles.chipTextInactive,
                            ]}
                            numberOfLines={1}
                          >
                            {airline}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                )}
              </>
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
    </View>
  );
}

// ---------------------------------------------------------------------------
// Sticky header styles
// ---------------------------------------------------------------------------

const stickyStyles = StyleSheet.create({
  // White band covering the safe area inset (notch / status bar area)
  safeAreaBand: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    zIndex: 101,
  },
  // Header container positioned just below the safe area inset
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    height: STICKY_HEADER_HEIGHT,
    backgroundColor: "#FFFFFF",
    zIndex: 100,
    // Shadow only casts downward -- offset pushes it below the header
    // so no bleed upward into the safe area band
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  inner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  // Subtle bottom border
  borderLine: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E2E8F0",
  },
  // Simple back chevron -- no glassmorphic blur, just a clean tap target
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnPressed: {
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  backChevron: {
    width: 10,
    height: 10,
    borderLeftWidth: 2.5,
    borderBottomWidth: 2.5,
    borderColor: "#0F172A",
    transform: [{ rotate: "45deg" }],
    marginLeft: 3, // visually center the chevron within the circle
  },
  // Center content block
  center: {
    flex: 1,
    alignItems: "center",
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  routeCode: {
    fontFamily: fonts.extraBold,
    fontSize: 16,
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  meta: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 1,
    letterSpacing: -0.1,
  },
  // Right spacer matches back button width for centered layout
  rightSpacer: {
    width: 40,
  },
});

// ---------------------------------------------------------------------------
// Styles
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
    marginBottom: 24,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.15)",
  },
  deleteBtnPressed: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    transform: [{ scale: 0.96 }],
  },
  deleteLink: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: "#EF4444",
  },

  // ---- Billboard: raw typography on mesh, no container ----

  // Route codes
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  routeCode: {
    fontFamily: fonts.extraBold,
    fontSize: 38,
    color: "#0F172A",
    letterSpacing: -1.2,
  },
  routeCodeRight: {
    textAlign: "right",
  },
  routeArrowWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  routeLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(148, 163, 184, 0.25)",
  },
  routeArrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(59, 130, 246, 0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.1)",
  },
  roundTripArrows: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  returnArrow: {
    transform: [{ rotate: "180deg" }],
  },

  // Trip type label
  tripTypeLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: "#94A3B8",
    letterSpacing: 0.3,
    marginBottom: 28,
  },

  // Price zone -- the dominant element on the billboard
  priceZone: {
    marginBottom: 14,
  },
  priceHeroValue: {
    fontFamily: fonts.extraBold,
    fontSize: 52,
    color: "#0F172A",
    letterSpacing: -2,
    lineHeight: 56,
  },
  priceHeroLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 4,
  },
  priceHeroEmpty: {
    fontFamily: fonts.regularItalic,
    fontSize: 20,
    color: "#94A3B8",
  },

  // Meta line: dates + nights
  metaLine: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: "#64748B",
    marginBottom: 6,
  },

  // Updated timestamp
  updatedLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: "#CBD5E1",
  },

  // Spacer between billboard and bridge bar
  billboardSpacer: {
    height: 24,
  },

  // ---- Bridge Bar: edge-to-edge tappable refresh bar ----
  // Caps the top of the strip slab. Uses negative margin to go edge-to-edge.
  bridgeBar: {
    marginHorizontal: -20,
    backgroundColor: "rgba(59, 130, 246, 0.05)",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(59, 130, 246, 0.1)",
  },
  bridgeBarPressed: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
  },
  bridgeBarCooldown: {
    backgroundColor: "rgba(148, 163, 184, 0.05)",
    borderColor: "rgba(148, 163, 184, 0.1)",
  },
  bridgeBarLoading: {
    backgroundColor: "rgba(59, 130, 246, 0.07)",
  },
  bridgeBarInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    // 44pt minimum touch target per iOS HIG
    minHeight: 44,
  },
  bridgeBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  bridgeBarTextWrap: {
    flex: 1,
  },
  bridgeBarLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: "#3B82F6",
    letterSpacing: -0.1,
  },
  bridgeBarLabelMuted: {
    color: "#94A3B8",
  },
  bridgeBarLabelActive: {
    color: "#2563EB",
  },
  bridgeBarSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 1,
  },

  // ---- Slab header: results count + filter (inside FloatingLayersContainer) ----
  slabHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(148, 163, 184, 0.15)",
  },
  slabResultsLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: "#64748B",
    letterSpacing: 0.2,
  },
  // ---- Airline chip filter row ----
  chipRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(148, 163, 184, 0.15)",
  },
  chipScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: "rgba(219, 234, 254, 0.6)",
    borderColor: "rgba(147, 197, 253, 0.5)",
  },
  chipInactive: {
    backgroundColor: "rgba(148, 163, 184, 0.06)",
    borderColor: "rgba(148, 163, 184, 0.15)",
  },
  chipPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  chipText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
  },
  chipTextActive: {
    color: "#3B82F6",
  },
  chipTextInactive: {
    color: "#94A3B8",
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
