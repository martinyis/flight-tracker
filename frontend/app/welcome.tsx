/**
 * Welcome / Landing screen — Option B + C combined layout.
 *
 * Story arc (top to bottom):
 *   1. Dot grid scanner — scans prices across dates            (~top 55-60%)
 *   2. Gradient fade overlay — grid dissolves into bg color
 *   3. Mini flight result card — "here's what we found"        (fade zone)
 *   4. Tagline — brand name + descriptor                       (below card)
 *   5. CTA buttons — pinned to bottom
 *
 * Animation sequence:
 *   0ms    → grid dots appear, scan line sweeps
 *   500ms  → first dot highlighted with tooltip
 *   1500ms → mini result card slides up and fades in
 *   2000ms → price on result card counts down ($187 → $142 → $94) over 1.5s
 */

import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import FlightPriceWave, { WAVE_AREA_H } from "../src/components/FlightPriceWave";
import { fonts } from "../src/utils/fonts";

const SCREEN_W = Dimensions.get("window").width;
const CARD_W = SCREEN_W * 0.85;

// Price steps for the mini result card countdown
const RESULT_PRICES = ["$187", "$142", "$94"];
const RESULT_PRICE_INTERVAL = 500; // ms between each step

// ---------------------------------------------------------------------------
// Mini flight result card — the payoff of the scanning sequence
// ---------------------------------------------------------------------------

function MiniResultCard() {
  const slideAnim = useRef(new Animated.Value(12)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [priceIdx, setPriceIdx] = useState(0);

  useEffect(() => {
    // Card entrance: delayed 1500ms, slides up + fades in over 600ms
    const entranceTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }, 1500);

    // Price countdown: starts 2000ms after mount
    // Steps: $187 → $142 → $94, each separated by RESULT_PRICE_INTERVAL
    const priceTimers: ReturnType<typeof setTimeout>[] = [];
    RESULT_PRICES.forEach((_, idx) => {
      if (idx === 0) return; // first value is already shown
      priceTimers.push(
        setTimeout(
          () => setPriceIdx(idx),
          2000 + (idx - 1) * RESULT_PRICE_INTERVAL
        )
      );
    });

    return () => {
      clearTimeout(entranceTimer);
      priceTimers.forEach(clearTimeout);
    };
  }, []);

  const isFinalPrice = priceIdx === RESULT_PRICES.length - 1;
  const currentPrice = RESULT_PRICES[priceIdx];

  return (
    <Animated.View
      style={[
        styles.resultCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Left column: route + details */}
      <View style={styles.resultCardLeft}>
        <Text style={styles.resultRoute}>JFK → LAX</Text>
        <Text style={styles.resultDate}>Mar 7 – Mar 12</Text>
        <Text style={styles.resultMeta}>5 nights · Direct</Text>
      </View>

      {/* Right column: price + label */}
      <View style={styles.resultCardRight}>
        {/* Green indicator dot */}
        <View style={styles.resultDotRow}>
          <View style={styles.greenDot} />
          <Text
            style={[
              styles.resultPrice,
              isFinalPrice && styles.resultPriceFinal,
            ]}
          >
            {currentPrice}
          </Text>
        </View>
        <Text style={styles.resultPriceLabel}>lowest found</Text>
      </View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Welcome screen
// ---------------------------------------------------------------------------

export default function WelcomeScreen() {
  const router = useRouter();

  // Content below the grid (tagline + buttons) fades and slides in
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    // Content appears shortly after mount so the grid animation is already
    // running when the tagline comes in
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(contentY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  // The gradient overlay covers the bottom ~38% of the grid area.
  // We position it absolutely within the grid wrapper so it sits perfectly
  // over the lower rows of dots.
  const gradientH = Math.round(WAVE_AREA_H * 0.58);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0A1628" />

      <SafeAreaView style={styles.safe}>
        {/* ── Zone 1: Tagline — brand first ── */}
        <Animated.View
          style={[
            styles.taglineWrap,
            {
              opacity: contentOpacity,
              transform: [{ translateY: contentY }],
            },
          ]}
        >
          <Text style={styles.brandName}>Skylens</Text>
          <Text style={styles.tagline}>
            We check every date so you don't have to.
          </Text>
        </Animated.View>

        {/* ── Zone 2 + 3: Dot grid with gradient fade overlay ── */}
        <View style={styles.gridZone}>
          <FlightPriceWave />

          {/* Gradient overlay: transparent → #0A1628, covering the lower rows */}
          <LinearGradient
            colors={["transparent", "#0A1628"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[
              styles.gridFade,
              {
                height: gradientH,
                bottom: 0,
              },
            ]}
            pointerEvents="none"
          />

          {/* ── Zone 4: Mini result card — sits in the fade zone ── */}
          <View style={styles.resultCardAnchor}>
            {/* Subtle visual connection from scanning grid to result */}
            <View style={styles.connectingLine} />
            <MiniResultCard />
          </View>
        </View>

        {/* ── Zone 5: Buttons — pinned to bottom ── */}
        <Animated.View
          style={[
            styles.buttonWrap,
            {
              opacity: contentOpacity,
              transform: [{ translateY: contentY }],
            },
          ]}
        >
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.primaryBtnPressed,
            ]}
            onPress={() => router.push("/register")}
          >
            <LinearGradient
              colors={["#3B82F6", "#06B6D4"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.gradientInner}
            >
              <Text style={styles.primaryBtnText}>Get Started</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryBtn,
              pressed && styles.secondaryBtnPressed,
            ]}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.secondaryBtnText}>I already have an account</Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0A1628",
  },
  safe: {
    flex: 1,
  },

  // ── Grid zone ──────────────────────────────────────────────────────────────

  gridZone: {
    // Height is determined by the wave component + card anchor below
    width: "100%",
  },

  // Gradient fade: sits absolutely over the bottom portion of the grid
  gridFade: {
    position: "absolute",
    left: 0,
    right: 0,
    // height and bottom are set inline
  },

  // Anchor for the result card: positioned at the bottom of the grid zone,
  // overlapping the fade so the card appears to "emerge" from the dissolve.
  resultCardAnchor: {
    alignItems: "center",
    marginTop: -28, // pull up into the fading rows
  },
  connectingLine: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(59, 130, 246, 0.08)",
    marginBottom: 6,
  },

  // ── Mini result card ───────────────────────────────────────────────────────

  resultCard: {
    width: CARD_W,
    backgroundColor: "#111D30",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.15)",
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    // Depth shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 10,
  },

  resultCardLeft: {
    flex: 1,
    gap: 5,
  },
  resultRoute: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  resultDate: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
  },
  resultMeta: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: "rgba(255,255,255,0.32)",
    marginTop: 1,
  },

  resultCardRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  resultDotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#22C55E",
    // Subtle glow
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  resultPrice: {
    fontFamily: fonts.bold,
    fontSize: 28,
    color: "rgba(255,255,255,0.5)", // muted until final step
    letterSpacing: -0.5,
  },
  resultPriceFinal: {
    color: "#22C55E", // green at the settled price
  },
  resultPriceLabel: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: "rgba(34, 197, 94, 0.55)",
    letterSpacing: 0.1,
  },

  // ── Tagline ────────────────────────────────────────────────────────────────

  taglineWrap: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  brandName: {
    fontFamily: fonts.extraBold,
    fontSize: 28,
    color: "#FFFFFF",
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  tagline: {
    fontFamily: fonts.regular,
    fontSize: 22,
    color: "rgba(255,255,255,0.6)",
    lineHeight: 32,
    letterSpacing: -0.2,
  },

  // ── Buttons ────────────────────────────────────────────────────────────────

  buttonWrap: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 24,
    paddingBottom: 44,
  },

  primaryBtn: {
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    overflow: "hidden",
  },
  primaryBtnPressed: {
    shadowOpacity: 0.15,
    transform: [{ scale: 0.98 }],
  },
  gradientInner: {
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
  },
  primaryBtnText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: "#FFFFFF",
  },

  secondaryBtn: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  secondaryBtnPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  secondaryBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: "#F8FAFC",
  },
});
