import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Animated,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AppButton from "../ui/AppButton";
import AirlineLogo from "../ui/AirlineLogo";
import { fonts } from "../../theme";
import { useHaptics } from "../../providers/HapticsProvider";

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// All bubbles are perfect circles of this diameter.
const BUBBLE_SIZE = 92;

// Staggered vertical offsets — deterministic by index — give the cloud
// an organic floating shape instead of a rigid grid.
const OFFSETS = [0, -10, 8, -14, 6, -8, 12, -6, 4, -12, 10, -4];

function offsetFor(i: number): number {
  return OFFSETS[i % OFFSETS.length];
}

// ---------------------------------------------------------------------------
// Checkmark icon (pure View, no emoji)
// ---------------------------------------------------------------------------

function CheckMark() {
  return (
    <View style={ck.wrap}>
      <View style={ck.shape} />
    </View>
  );
}

const ck = StyleSheet.create({
  wrap: {
    width: 10,
    height: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  shape: {
    width: 6.5,
    height: 3.8,
    borderLeftWidth: 1.8,
    borderBottomWidth: 1.8,
    borderColor: "#FFFFFF",
    transform: [{ rotate: "-45deg" }],
    marginTop: -2,
  },
});

// ---------------------------------------------------------------------------
// Single bubble
// ---------------------------------------------------------------------------

function Bubble({
  airline,
  logoUrl,
  isSelected,
  onPress,
  index,
}: {
  airline: string;
  logoUrl?: string;
  isSelected: boolean;
  onPress: () => void;
  index: number;
}) {
  const entranceY     = useRef(new Animated.Value(36)).current;
  const entranceScale = useRef(new Animated.Value(0.78)).current;
  const entranceAlpha = useRef(new Animated.Value(0)).current;
  const tapScale      = useRef(new Animated.Value(1)).current;
  const badgeScale    = useRef(new Animated.Value(0)).current;

  // Staggered entrance
  useEffect(() => {
    const delay = index * 52;
    Animated.parallel([
      Animated.spring(entranceY,     { toValue: 0, delay, tension: 95, friction: 12, useNativeDriver: true }),
      Animated.spring(entranceScale, { toValue: 1, delay, tension: 95, friction: 12, useNativeDriver: true }),
      Animated.timing(entranceAlpha, { toValue: 1, delay, duration: 180, useNativeDriver: true }),
    ]).start();
  }, []);

  // Badge pop on selection change
  useEffect(() => {
    Animated.spring(badgeScale, {
      toValue: isSelected ? 1 : 0,
      tension: 280,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [isSelected]);

  const haptics = useHaptics();
  const handlePress = () => {
    haptics.light();
    Animated.sequence([
      Animated.spring(tapScale, { toValue: isSelected ? 0.9 : 1.12, tension: 300, friction: 7, useNativeDriver: true }),
      Animated.spring(tapScale, { toValue: 1, tension: 220, friction: 9, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  const verticalOffset = offsetFor(index);

  return (
    <Animated.View
      style={[
        styles.bubbleShell,
        {
          opacity: entranceAlpha,
          transform: [
            { translateY: Animated.add(entranceY, new Animated.Value(verticalOffset)) },
            { scale: Animated.multiply(entranceScale, tapScale) },
          ],
          // Glow switches from soft neutral to vivid blue when selected
          shadowColor:   isSelected ? "#2563EB" : "#93C5FD",
          shadowOpacity: isSelected ? 0.45 : 0.22,
          shadowRadius:  isSelected ? 16 : 8,
          elevation:     isSelected ? 10 : 3,
        },
      ]}
    >
      <Pressable onPress={handlePress} style={styles.bubblePressable}>
        {isSelected ? (
          // ── Selected: rich blue gradient ──────────────────────────────────
          <LinearGradient
            colors={["#1D4ED8", "#3B82F6", "#60A5FA"]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={styles.bubbleCircle}
          >
            {/* Top-right glass sheen */}
            <View style={styles.sheen} />

            {/* Logo — white semi-transparent halo */}
            <View style={styles.logoRingSelected}>
              <AirlineLogo
                airline={airline}
                logoUrl={logoUrl}
                size={32}
                bgColor="rgba(255,255,255,0.18)"
              />
            </View>

            {/* Name */}
            <Text style={styles.nameSelected} numberOfLines={1} adjustsFontSizeToFit>
              {airline}
            </Text>

            {/* Corner checkmark badge */}
            <Animated.View style={[styles.checkBadge, { transform: [{ scale: badgeScale }] }]}>
              <CheckMark />
            </Animated.View>
          </LinearGradient>
        ) : (
          // ── Unselected: frosted glass blue ────────────────────────────────
          <View style={styles.bubbleCircleGlass}>
            {/* Inner frosted tint layer */}
            <View style={styles.glassTint} />

            {/* Logo — sits on a slightly deeper glass disc */}
            <View style={styles.logoRingGlass}>
              <AirlineLogo
                airline={airline}
                logoUrl={logoUrl}
                size={32}
                bgColor="rgba(219,234,254,0.6)"
              />
            </View>

            {/* Name */}
            <Text style={styles.nameGlass} numberOfLines={1} adjustsFontSizeToFit>
              {airline}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Main screen component
// ---------------------------------------------------------------------------

export default function AirlineFilterStep({
  availableAirlines,
  airlineLogos = {},
  onConfirm,
  onSkip,
}: {
  availableAirlines: string[];
  airlineLogos?: Record<string, string>;
  resultsError?: string;
  onConfirm: (selectedAirlines: string[]) => void;
  onSkip: () => void;
}) {
  const haptics = useHaptics();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);

  const toggleAirline = (airline: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(airline) ? next.delete(airline) : next.add(airline);
      return next;
    });

  const selectAll = () => { haptics.light(); setSelected(new Set(availableAirlines)); };
  const clearAll  = () => { haptics.light(); setSelected(new Set()); };

  const handleApply = async () => {
    setApplying(true);
    const airlines = selected.size === 0 ? availableAirlines : Array.from(selected);
    await onConfirm(airlines);
  };

  const selectedCount = selected.size;
  const allSelected   = selectedCount === availableAirlines.length;
  const noneSelected  = selectedCount === 0;

  const buttonLabel =
    noneSelected || allSelected
      ? "Show All Airlines"
      : `Show ${selectedCount} Airline${selectedCount > 1 ? "s" : ""}`;

  // Header fade-down entrance
  const headerAlpha = useRef(new Animated.Value(0)).current;
  const headerY     = useRef(new Animated.Value(-10)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerAlpha, { toValue: 1, duration: 340, useNativeDriver: true }),
      Animated.spring(headerY,     { toValue: 0, tension: 80, friction: 14, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.root}>
      {/* Background — clean blue-white gradient */}
      <LinearGradient
        colors={["#EBF3FF", "#F0F6FF", "#F7FAFF", "#FAFCFF"]}
        locations={[0, 0.35, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>

        {/* Header */}
        <Animated.View style={[styles.header, { opacity: headerAlpha, transform: [{ translateY: headerY }] }]}>
          <Text style={styles.title}>Filter airlines</Text>
          <Text style={styles.subtitle}>Tap to pick. Leave all unselected to show every airline.</Text>
        </Animated.View>

        {/* Controls row */}
        <View style={styles.controlsRow}>
          <Text style={styles.countLabel}>
            {noneSelected ? "None selected" : allSelected ? "All selected" : `${selectedCount} of ${availableAirlines.length}`}
          </Text>
          <Pressable
            onPress={allSelected ? clearAll : selectAll}
            style={({ pressed }) => [styles.togglePill, pressed && styles.togglePillPressed]}
          >
            <Text style={styles.togglePillText}>{allSelected ? "Clear all" : "Select all"}</Text>
          </Pressable>
        </View>

        {/* Bubble cloud — centered vertically when content fits on screen */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.cloud}
          showsVerticalScrollIndicator={false}
        >
          {availableAirlines.map((airline, i) => (
            <Bubble
              key={airline}
              airline={airline}
              logoUrl={airlineLogos[airline]}
              isSelected={selected.has(airline)}
              onPress={() => toggleAirline(airline)}
              index={i}
            />
          ))}
        </ScrollView>

        {/* Bottom action bar */}
        <View style={styles.bottomBar}>
          <View style={styles.bottomButtons}>
            <View style={styles.skipWrap}>
              <AppButton label="Skip" variant="secondary" onPress={onSkip} disabled={applying} />
            </View>
            <View style={styles.applyWrap}>
              <AppButton label={buttonLabel} onPress={handleApply} disabled={applying} loading={applying} />
            </View>
          </View>
        </View>

      </SafeAreaView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: { flex: 1 },

  safeArea: { flex: 1 },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 12,
  },
  title: {
    fontFamily: fonts.extraBold,
    fontSize: 26,
    color: "#0F172A",
    letterSpacing: -0.4,
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 13.5,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },

  // ── Controls row ──────────────────────────────────────────────────────────
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginBottom: 10,
  },
  countLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: "#94A3B8",
  },
  togglePill: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "rgba(59,130,246,0.09)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.2)",
  },
  togglePillPressed: {
    backgroundColor: "rgba(59,130,246,0.18)",
  },
  togglePillText: {
    fontFamily: fonts.semiBold,
    fontSize: 12.5,
    color: "#3B82F6",
  },

  // ── Bubble cloud ──────────────────────────────────────────────────────────
  scroll: { flex: 1 },
  cloud: {
    flexGrow: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    // alignItems center + flexGrow 1 lets the wrapped rows sit in the
    // middle of the available vertical space when content is short.
    alignItems: "center",
    alignContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },

  // Outer shell — holds the shadow separate from the clipped inner view
  bubbleShell: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    shadowOffset: { width: 0, height: 5 },
    backgroundColor: "transparent",
  },

  // Pressable clips the inner circle
  bubblePressable: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    overflow: "hidden",
  },

  // ── Selected bubble internals ─────────────────────────────────────────────
  bubbleCircle: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    overflow: "hidden",
  },
  // Top-right specular sheen
  sheen: {
    position: "absolute",
    top: -14,
    right: -14,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  // White halo ring around the logo
  logoRingSelected: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.42)",
    alignItems: "center",
    justifyContent: "center",
  },
  nameSelected: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: "#FFFFFF",
    letterSpacing: 0.2,
    textAlign: "center",
    paddingHorizontal: 6,
  },
  // Corner checkmark badge
  checkBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Unselected bubble internals — frosted glass ───────────────────────────
  bubbleCircleGlass: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    overflow: "hidden",
    // Glass base: white with a blue sky tint
    backgroundColor: "rgba(255,255,255,0.62)",
    borderWidth: 1.5,
    borderColor: "rgba(147,197,253,0.55)",
  },
  // Inner frosted-blue tint layer — gives depth beyond a flat white
  glassTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(219,234,254,0.28)",
    borderRadius: BUBBLE_SIZE / 2,
  },
  // Logo sits on a slightly deeper blue-glass disc
  logoRingGlass: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(219,234,254,0.55)",
    borderWidth: 1,
    borderColor: "rgba(147,197,253,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  nameGlass: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    color: "#1E3A5F",
    letterSpacing: 0.1,
    textAlign: "center",
    paddingHorizontal: 6,
  },

  // ── Bottom bar ────────────────────────────────────────────────────────────
  bottomBar: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(186,218,255,0.6)",
    backgroundColor: "rgba(240,247,255,0.94)",
  },
  bottomButtons: { flexDirection: "row", gap: 12 },
  skipWrap:  { flex: 2 },
  applyWrap: { flex: 3 },
});
