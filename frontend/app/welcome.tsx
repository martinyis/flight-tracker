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
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import FlightPriceWave, { WAVE_AREA_H } from "../src/components/welcome/FlightPriceWave";
import { useAuth } from "../src/providers/AuthProvider";
import { useHaptics } from "../src/providers/HapticsProvider";
import { useGoogleAuth } from "../src/hooks/useGoogleAuth";
import { useAppleAuth } from "../src/hooks/useAppleAuth";
import { fonts } from "../src/theme";

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
// Social icon helpers
// ---------------------------------------------------------------------------

function AppleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="#F8FAFC">
      <Path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </Svg>
  );
}

function GoogleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Welcome screen
// ---------------------------------------------------------------------------

export default function WelcomeScreen() {
  const router = useRouter();
  const { loginWithToken } = useAuth();
  const haptics = useHaptics();

  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  const { promptAsync: promptGoogleAsync, isReady: googleReady } =
    useGoogleAuth(
      async (token) => {
        setGoogleLoading(false);
        haptics.success();
        await loginWithToken(token);
        router.replace("/");
      },
      (message) => {
        setGoogleLoading(false);
        haptics.error();
        setError(message);
      }
    );

  const { signIn: appleSignIn } = useAppleAuth(
    async (token) => {
      setAppleLoading(false);
      haptics.success();
      await loginWithToken(token);
      router.replace("/");
    },
    (message) => {
      setAppleLoading(false);
      haptics.error();
      setError(message);
    }
  );

  const handleGoogleSignIn = async () => {
    haptics.medium();
    setError("");
    setGoogleLoading(true);
    await promptGoogleAsync();
  };

  const handleAppleSignIn = async () => {
    haptics.medium();
    setError("");
    setAppleLoading(true);
    await appleSignIn();
  };

  // Content below the grid (tagline + buttons) fades and slides in
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
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

          <View style={styles.resultCardAnchor}>
            <View style={styles.connectingLine} />
            <MiniResultCard />
          </View>
        </View>

        {/* ── Zone 5: Social auth buttons — pinned to bottom ── */}
        <Animated.View
          style={[
            styles.buttonWrap,
            {
              opacity: contentOpacity,
              transform: [{ translateY: contentY }],
            },
          ]}
        >
          {error ? (
            <View style={styles.errorWrap}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Apple Sign-In */}
          {Platform.OS === "ios" && (
            <Pressable
              style={({ pressed }) => [
                styles.socialBtn,
                styles.appleBtn,
                pressed && styles.socialBtnPressed,
              ]}
              onPress={handleAppleSignIn}
              disabled={appleLoading}
            >
              {appleLoading ? (
                <ActivityIndicator color="#F8FAFC" size="small" />
              ) : (
                <>
                  <AppleIcon />
                  <Text style={styles.socialBtnText}>Continue with Apple</Text>
                </>
              )}
            </Pressable>
          )}

          {/* Google Sign-In */}
          <Pressable
            style={({ pressed }) => [
              styles.socialBtn,
              styles.googleBtn,
              pressed && styles.socialBtnPressed,
            ]}
            onPress={handleGoogleSignIn}
            disabled={!googleReady || googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color="#F8FAFC" size="small" />
            ) : (
              <>
                <GoogleIcon />
                <Text style={styles.socialBtnText}>Continue with Google</Text>
              </>
            )}
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
    gap: 12,
  },

  errorWrap: {
    backgroundColor: "rgba(220,38,38,0.15)",
    borderRadius: 10,
    padding: 12,
  },
  errorText: {
    fontFamily: fonts.regular,
    color: "#FCA5A5",
    fontSize: 14,
    textAlign: "center",
  },

  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 18,
    borderWidth: 1,
  },
  socialBtnPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.85,
  },
  appleBtn: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.2)",
  },
  googleBtn: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.12)",
  },
  socialBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: "#F8FAFC",
  },
});
