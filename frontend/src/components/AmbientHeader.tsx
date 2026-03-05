import { useEffect, useRef } from "react";
import { View, Text, Animated, Easing, StyleSheet, Dimensions } from "react-native";
import Svg, { Path, Defs, LinearGradient as SvgGrad, Stop } from "react-native-svg";
import { fonts } from "../utils/fonts";

const SCREEN_WIDTH = Dimensions.get("window").width;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AmbientHeaderProps {
  activeCount: number;
  priceDropCount: number;
  totalCount: number;
}

// ---------------------------------------------------------------------------
// Time-based greeting
// ---------------------------------------------------------------------------

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// ---------------------------------------------------------------------------
// Dynamic insight line
// ---------------------------------------------------------------------------

function getInsight(props: AmbientHeaderProps): string {
  const { activeCount, priceDropCount, totalCount } = props;
  if (totalCount === 0) return "Start tracking your first flight";
  if (priceDropCount > 0)
    return `${priceDropCount} price${priceDropCount > 1 ? "s" : ""} dropped recently`;
  if (activeCount === 0) return "All searches paused";
  if (activeCount === 1) return "1 search tracking prices for you";
  return `${activeCount} searches tracking prices`;
}

// ---------------------------------------------------------------------------
// SVG cloud with proper bezier curves and gradient fill.
// startX lets us place clouds at various on-screen positions initially
// so the header never feels empty on load.
// ---------------------------------------------------------------------------

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

// Three distinct cloud path shapes for variety
const CLOUD_PATHS = [
  // Fluffy cumulus — wider, rounder bumps
  "M8,40 Q0,36 4,26 Q7,16 20,14 Q24,4 42,2 Q60,0 70,12 Q80,7 94,12 Q110,18 108,30 Q106,42 92,44 Z",
  // Stretched wisp — flatter, elongated
  "M5,36 Q0,30 10,22 Q18,14 32,13 Q38,4 54,3 Q70,2 78,10 Q88,6 100,14 Q114,20 112,32 Q110,40 96,42 Z",
  // Puffy small — rounder, compact
  "M12,38 Q4,34 8,24 Q14,12 28,10 Q34,2 48,2 Q64,2 72,14 Q82,10 96,16 Q108,22 106,34 Q104,42 90,42 Z",
];

function SvgCloud({
  top,
  width,
  height,
  duration,
  startX,
  opacity,
  pathIndex,
}: {
  top: number;
  width: number;
  height: number;
  duration: number;
  /** Starting X position — allows clouds to appear on-screen immediately */
  startX: number;
  opacity: number;
  pathIndex: number;
}) {
  const translateX = useRef(new Animated.Value(startX)).current;

  useEffect(() => {
    // First: animate from startX to off-screen right
    const firstLeg = SCREEN_WIDTH + 40 - startX;
    const firstDuration = (firstLeg / (SCREEN_WIDTH + width + 80)) * duration;

    const animateLoop = () => {
      translateX.setValue(-width - 40);
      Animated.timing(translateX, {
        toValue: SCREEN_WIDTH + 40,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(() => animateLoop());
    };

    // First animation from initial position
    Animated.timing(translateX, {
      toValue: SCREEN_WIDTH + 40,
      duration: firstDuration,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start(() => animateLoop());
  }, []);

  const cloudPath = CLOUD_PATHS[pathIndex % CLOUD_PATHS.length];

  return (
    <AnimatedSvg
      width={width}
      height={height}
      viewBox="0 0 120 50"
      style={{
        position: "absolute",
        top,
        left: 0,
        opacity,
        transform: [{ translateX }],
      }}
      pointerEvents="none"
    >
      <Defs>
        <SvgGrad id={`cg-${top}-${startX}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
          <Stop offset="1" stopColor="#E0EDFF" stopOpacity="0.7" />
        </SvgGrad>
      </Defs>
      <Path d={cloudPath} fill={`url(#cg-${top}-${startX})`} />
    </AnimatedSvg>
  );
}

// ---------------------------------------------------------------------------
// SVG paper airplane — larger and more visible
// ---------------------------------------------------------------------------

function SvgPlane() {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: 14000,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(() => animate());
    };
    // Start after a short delay
    const timeout = setTimeout(animate, 1500);
    return () => clearTimeout(timeout);
  }, []);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, SCREEN_WIDTH + 50],
  });
  const translateY = progress.interpolate({
    inputRange: [0, 0.2, 0.45, 0.7, 1],
    outputRange: [0, -12, -22, -8, 8],
  });
  const rotate = progress.interpolate({
    inputRange: [0, 0.2, 0.45, 0.7, 1],
    outputRange: ["-6deg", "-14deg", "0deg", "10deg", "12deg"],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 48,
        left: 0,
        transform: [{ translateX }, { translateY }, { rotate }],
      }}
    >
      <Svg width={38} height={28} viewBox="0 0 38 28">
        <Defs>
          <SvgGrad id="pg" x1="1" y1="0" x2="0" y2="0.3">
            <Stop offset="0" stopColor="#93C5FD" stopOpacity="0.8" />
            <Stop offset="1" stopColor="#3B82F6" stopOpacity="0.55" />
          </SvgGrad>
        </Defs>
        {/* Top wing — tip points RIGHT (direction of travel) */}
        <Path d="M38,14 L0,0 L24,14 Z" fill="url(#pg)" />
        {/* Bottom wing — slightly lighter */}
        <Path d="M38,14 L0,28 L24,14 Z" fill="#93C5FD" fillOpacity="0.4" />
        {/* Fold line */}
        <Path d="M24,14 L38,14" stroke="#3B82F6" strokeWidth="0.6" strokeOpacity="0.4" />
      </Svg>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AmbientHeader(props: AmbientHeaderProps) {
  const greeting = getGreeting();
  const insight = getInsight(props);

  const textOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(textOpacity, {
      toValue: 1,
      duration: 600,
      delay: 200,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={styles.container}>
      {/* Ambient sky layer — multiple clouds at various starting positions */}
      <View style={styles.ambientLayer} pointerEvents="none">
        {/* Large cloud — starts center-right */}
        <SvgCloud
          top={-14} width={190} height={76} duration={32000}
          startX={SCREEN_WIDTH * 0.45} opacity={0.85} pathIndex={0}
        />
        {/* Medium cloud — starts left side */}
        <SvgCloud
          top={20} width={150} height={60} duration={38000}
          startX={SCREEN_WIDTH * 0.05} opacity={0.75} pathIndex={1}
        />
        {/* Cloud — starts far right */}
        <SvgCloud
          top={4} width={120} height={48} duration={28000}
          startX={SCREEN_WIDTH * 0.7} opacity={0.7} pathIndex={2}
        />
        {/* Lower cloud — starts center */}
        <SvgCloud
          top={46} width={110} height={44} duration={34000}
          startX={SCREEN_WIDTH * 0.3} opacity={0.6} pathIndex={0}
        />
        {/* Small distant cloud — slow, high */}
        <SvgCloud
          top={-2} width={80} height={32} duration={42000}
          startX={SCREEN_WIDTH * 0.15} opacity={0.5} pathIndex={2}
        />

        {/* Paper airplane */}
        <SvgPlane />
      </View>

      {/* Text */}
      <Animated.View style={[styles.textLayer, { opacity: textOpacity }]}>
        <Text style={styles.greeting}>{greeting}</Text>
        <Text style={styles.insight}>{insight}</Text>
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 28,
    minHeight: 120,
    overflow: "hidden",
  },
  ambientLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  textLayer: {
    zIndex: 1,
  },
  greeting: {
    fontFamily: fonts.bold,
    fontSize: 30,
    color: "#0F172A",
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  insight: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: "#64748B",
    letterSpacing: 0.1,
  },
});
