import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Animated,
  Easing,
  Dimensions,
  StyleSheet,
  StatusBar,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { CalendarSearch, TrendingDown, Bell, Sparkles } from "lucide-react-native";
import { useAuth } from "../src/providers/AuthProvider";
import { useHaptics } from "../src/providers/HapticsProvider";
import { fonts } from "../src/theme";

const { width: SCREEN_W } = Dimensions.get("window");

// ---------------------------------------------------------------------------
// Colors (from DESIGN_SYSTEM.md)
// ---------------------------------------------------------------------------

const C = {
  primary: "#2F9CF4",
  primaryDark: "#1A7ED4",
  primary100: "#E0F2FE",
  primary200: "#BAE1FC",
  primary300: "#8FD0FA",
  warm500: "#F59E0B",
  green: "#22C55E",
  n900: "#0F172A",
  n500: "#64748B",
  n400: "#94A3B8",
  n300: "#CBD5E1",
  n200: "#E2E8F0",
};

// ---------------------------------------------------------------------------
// Mesh background (reused from design system)
// ---------------------------------------------------------------------------

function MeshBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={["#DCEEFB", "#EBF3FE", "#F4F8FF", "#FAFCFF"]}
        locations={[0, 0.3, 0.65, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={["rgba(143, 208, 250, 0.12)", "transparent"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.55 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={["transparent", "rgba(165, 180, 252, 0.06)"]}
        start={{ x: 0, y: 0.4 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Abstract date grid visual (Screen 1)
// ---------------------------------------------------------------------------

function DateGridVisual() {
  const pulse = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.3, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const ROWS = 4;
  const COLS = 7;
  const highlightRow = 2;
  const highlightCol = 3;

  return (
    <View style={visualStyles.grid}>
      {Array.from({ length: ROWS }).map((_, r) => (
        <View key={r} style={visualStyles.gridRow}>
          {Array.from({ length: COLS }).map((_, c) => {
            const isHighlight = r === highlightRow && c === highlightCol;
            return (
              <Animated.View
                key={c}
                style={[
                  visualStyles.dot,
                  isHighlight && visualStyles.dotHighlight,
                  isHighlight && { opacity: pulse },
                ]}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

const visualStyles = StyleSheet.create({
  grid: {
    gap: 12,
    alignItems: "center",
    marginBottom: 40,
  },
  gridRow: {
    flexDirection: "row",
    gap: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.primary200,
  },
  dotHighlight: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: C.primary,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
});

// ---------------------------------------------------------------------------
// Page indicator dots
// ---------------------------------------------------------------------------

function PageDots({ current, total }: { current: number; total: number }) {
  return (
    <View style={dotStyles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            dotStyles.dot,
            i === current && dotStyles.dotActive,
          ]}
        />
      ))}
    </View>
  );
}

const dotStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.n300,
  },
  dotActive: {
    width: 20,
    backgroundColor: C.primary,
  },
});

// ---------------------------------------------------------------------------
// Animated page content wrapper
// ---------------------------------------------------------------------------

function AnimatedPageContent({ children, active }: { children: React.ReactNode; active: boolean }) {
  const fade = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (active) {
      fade.setValue(0);
      slideY.setValue(20);
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 500, delay: 100, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(slideY, { toValue: 0, duration: 500, delay: 100, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }
  }, [active]);

  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: slideY }] }}>
      {children}
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Main onboarding screen
// ---------------------------------------------------------------------------

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const { clearOnboarding } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (page !== currentPage) setCurrentPage(page);
  }, [currentPage]);

  const goToPage = (page: number) => {
    haptics.light();
    scrollRef.current?.scrollTo({ x: page * SCREEN_W, animated: true });
  };

  const handleNext = () => {
    if (currentPage < 2) {
      goToPage(currentPage + 1);
    }
  };

  const handleSkip = () => {
    haptics.light();
    clearOnboarding();
    router.replace("/");
  };

  const handleStartSearch = () => {
    haptics.medium();
    clearOnboarding();
    router.replace("/add-search");
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <MeshBackground />

      {/* Skip button */}
      {currentPage < 2 && (
        <Pressable
          style={[styles.skipBtn, { top: insets.top + 12 }]}
          onPress={handleSkip}
          hitSlop={12}
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      )}

      {/* Paging scroll */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
        style={styles.scroll}
      >
        {/* ── Screen 1: Value Prop ── */}
        <View style={[styles.page, { paddingTop: insets.top + 80 }]}>
          <AnimatedPageContent active={currentPage === 0}>
            <DateGridVisual />
            <Text style={styles.headline}>
              Find the cheapest{"\n"}dates to fly
            </Text>
            <Text style={styles.subtext}>
              Most people check a few dates and hope for the best. We check every
              date combination to find the absolute lowest price.
            </Text>
          </AnimatedPageContent>
        </View>

        {/* ── Screen 2: How It Works ── */}
        <View style={[styles.page, { paddingTop: insets.top + 80 }]}>
          <AnimatedPageContent active={currentPage === 1}>
            <Text style={styles.headline}>
              We do the{"\n"}tedious work
            </Text>
            <View style={styles.featureList}>
              <View style={styles.featureRow}>
                <View style={[styles.featureIcon, { backgroundColor: "rgba(47, 156, 244, 0.08)" }]}>
                  <CalendarSearch size={20} color={C.primary} strokeWidth={2} />
                </View>
                <View style={styles.featureTextWrap}>
                  <Text style={styles.featureTitle}>Hundreds of dates</Text>
                  <Text style={styles.featureDesc}>Every date combination checked in seconds</Text>
                </View>
              </View>
              <View style={styles.featureRow}>
                <View style={[styles.featureIcon, { backgroundColor: "rgba(34, 197, 94, 0.08)" }]}>
                  <TrendingDown size={20} color={C.green} strokeWidth={2} />
                </View>
                <View style={styles.featureTextWrap}>
                  <Text style={styles.featureTitle}>Lowest price found</Text>
                  <Text style={styles.featureDesc}>The absolute cheapest flight for your trip</Text>
                </View>
              </View>
              <View style={styles.featureRow}>
                <View style={[styles.featureIcon, { backgroundColor: "rgba(47, 156, 244, 0.08)" }]}>
                  <Bell size={20} color={C.primary} strokeWidth={2} />
                </View>
                <View style={styles.featureTextWrap}>
                  <Text style={styles.featureTitle}>Price drop alerts</Text>
                  <Text style={styles.featureDesc}>Get notified when prices go down</Text>
                </View>
              </View>
            </View>
          </AnimatedPageContent>
        </View>

        {/* ── Screen 3: Let's Try It ── */}
        <View style={[styles.page, { paddingTop: insets.top + 80 }]}>
          <AnimatedPageContent active={currentPage === 2}>
            <Text style={styles.headline}>
              Let's find your{"\n"}first deal
            </Text>
            <Text style={styles.subtext}>
              Your first search is free — no credits needed.{"\n"}
              Pick a route and dates, and we'll show you the cheapest options.
            </Text>

            <View style={styles.creditHint}>
              <View style={styles.creditHintIcon}>
                <Sparkles size={16} color={C.primary} strokeWidth={2} />
              </View>
              <Text style={styles.creditHintText}>
                <Text style={styles.creditHintBold}>50 free credits</Text> to start tracking prices
              </Text>
            </View>

            {/* Primary CTA with glow */}
            <Pressable
              style={({ pressed }) => [
                styles.ctaBtn,
                pressed && styles.ctaBtnPressed,
              ]}
              onPress={handleStartSearch}
            >
              <LinearGradient
                colors={["#2F9CF4", "#06B6D4"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaGradient}
              >
                <Text style={styles.ctaBtnText}>Search for flights</Text>
              </LinearGradient>
            </Pressable>
          </AnimatedPageContent>
        </View>
      </ScrollView>

      {/* Bottom area: page dots + next button */}
      <View style={[styles.bottomArea, { paddingBottom: insets.bottom + 24 }]}>
        <PageDots current={currentPage} total={3} />

        {currentPage < 2 ? (
          <Pressable
            style={({ pressed }) => [
              styles.nextBtn,
              pressed && styles.nextBtnPressed,
            ]}
            onPress={handleNext}
          >
            <Text style={styles.nextBtnText}>Next</Text>
          </Pressable>
        ) : (
          <View style={{ height: 48 }} />
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#DCEEFB",
  },
  scroll: {
    flex: 1,
  },
  page: {
    width: SCREEN_W,
    paddingHorizontal: 24,
  },

  // Skip
  skipBtn: {
    position: "absolute",
    right: 20,
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  skipText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: C.n500,
  },

  // Headlines
  headline: {
    fontFamily: fonts.extraBold,
    fontSize: 30,
    color: C.n900,
    letterSpacing: -0.8,
    lineHeight: 36,
    marginBottom: 16,
  },
  subtext: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: C.n500,
    lineHeight: 24,
    marginBottom: 32,
  },

  // Feature list (Screen 2)
  featureList: {
    gap: 24,
    marginTop: 8,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  featureTextWrap: {
    flex: 1,
    gap: 2,
  },
  featureTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: C.n900,
    letterSpacing: -0.1,
  },
  featureDesc: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: C.n500,
    lineHeight: 20,
  },

  // Credit hint (Screen 3)
  creditHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(47, 156, 244, 0.06)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(47, 156, 244, 0.12)",
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 32,
  },
  creditHintIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(47, 156, 244, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  creditHintText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: C.n500,
    flex: 1,
    lineHeight: 20,
  },
  creditHintBold: {
    fontFamily: fonts.semiBold,
    color: C.n900,
  },

  // Primary CTA
  ctaBtn: {
    borderRadius: 12,
    overflow: "hidden",
    // Blue glow shadow
    shadowColor: "#2F9CF4",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaBtnPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  ctaGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: "center",
    borderRadius: 12,
  },
  ctaBtnText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },

  // Bottom area
  bottomArea: {
    paddingHorizontal: 24,
    gap: 20,
    alignItems: "center",
  },
  nextBtn: {
    backgroundColor: "rgba(47, 156, 244, 0.06)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(47, 156, 244, 0.15)",
    paddingVertical: 14,
    paddingHorizontal: 48,
  },
  nextBtnPressed: {
    backgroundColor: "rgba(47, 156, 244, 0.1)",
    transform: [{ scale: 0.97 }],
  },
  nextBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: C.primaryDark,
  },
});
