import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Animated,
  Pressable,
  StyleSheet,
  Dimensions,
  Easing,
} from "react-native";
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient as SvgGrad,
  Stop,
} from "react-native-svg";
import { Plane } from "lucide-react-native";
import { colors, fonts } from "../../theme";
import MeshBackground from "../ui/MeshBackground";

const { width: SCREEN_W } = Dimensions.get("window");

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SearchingOverlayProps {
  origin: string;
  destination: string;
  comboCount?: number;
  onContinueBrowsing?: () => void;
}

// ---------------------------------------------------------------------------
// Tips
// ---------------------------------------------------------------------------

function buildTips(origin: string, destination: string, comboCount?: number) {
  const route = `${origin.toUpperCase()} \u2192 ${destination.toUpperCase()}`;
  const combo = comboCount && comboCount > 1;

  return [
    combo
      ? `Checking ${comboCount} date combinations for ${route}`
      : `Scanning for better deals on ${route}`,
    "We run a separate search for every date combination \u2014 so you don\u2019t have to",
    "Your results will show the cheapest price for each departure date",
    "Tap any result card to see full flight details, stops, and airlines",
    "Found a great price? Start watching and we\u2019ll alert you if it drops",
    "We scan watched flight prices every 4 hours to catch flash sales",
    "Being flexible by just 1\u20132 days on your return can save 20\u201330%",
    "Red-eye flights departing after 10pm are often 15% cheaper",
    "Prices tend to spike 3 weeks before departure as last-minute demand rises",
    "Your results are almost ready\u2026",
  ];
}

const TIP_DURATION = 8000;
const CHAR_SPEED = 28; // ms per character typing
const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789$%#@&";

// ---------------------------------------------------------------------------
// Typewriter hook
// ---------------------------------------------------------------------------

function useTypewriter(tips: string[]) {
  const [display, setDisplay] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const tipIndexRef = useRef(0);
  const phaseRef = useRef<"typing" | "holding" | "scrambling">("typing");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    let charIdx = 0;
    tipIndexRef.current = 0;
    phaseRef.current = "typing";

    const typeCurrentTip = () => {
      const tip = tips[tipIndexRef.current];
      if (!tip) return;
      charIdx = 0;
      phaseRef.current = "typing";
      setShowCursor(true);

      clearTimer();
      timerRef.current = setInterval(() => {
        charIdx++;
        if (charIdx > tip.length) {
          clearTimer();
          phaseRef.current = "holding";

          // If last tip, just stay
          if (tipIndexRef.current >= tips.length - 1) {
            setShowCursor(false);
            return;
          }

          // Hold, then scramble out
          setTimeout(() => {
            scrambleOut();
          }, TIP_DURATION - tip.length * CHAR_SPEED - 600);
        } else {
          setDisplay(tip.slice(0, charIdx));
        }
      }, CHAR_SPEED);
    };

    const scrambleOut = () => {
      const currentText = tips[tipIndexRef.current] || "";
      let remaining = currentText.length;
      phaseRef.current = "scrambling";
      setShowCursor(false);

      clearTimer();
      timerRef.current = setInterval(() => {
        remaining -= 2;
        if (remaining <= 0) {
          clearTimer();
          setDisplay("");
          tipIndexRef.current++;
          setTimeout(typeCurrentTip, 150);
        } else {
          // Replace trailing chars with random glitch characters
          const clean = currentText.slice(0, remaining);
          const scrambled = Array.from({ length: Math.min(4, currentText.length - remaining) }, () =>
            SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
          ).join("");
          setDisplay(clean + scrambled);
        }
      }, 20);
    };

    typeCurrentTip();

    return () => clearTimer();
  }, [tips]);

  // Blinking cursor
  const [cursorVisible, setCursorVisible] = useState(true);
  useEffect(() => {
    const blink = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(blink);
  }, []);

  const cursor = showCursor && cursorVisible ? "|" : showCursor ? " " : "";
  return display + cursor;
}

// ---------------------------------------------------------------------------
// Sky Journey — SVG flight arc
// ---------------------------------------------------------------------------

// Bezier control points for the arc
const ARC_LEFT_X = SCREEN_W * 0.12;
const ARC_RIGHT_X = SCREEN_W * 0.88;
const ARC_Y = 160; // endpoints Y
const ARC_PEAK_Y = 40; // top of the arc
const ARC_MID_X = SCREEN_W * 0.5;

// Quadratic bezier: P(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
function bezierPoint(t: number) {
  const x =
    (1 - t) * (1 - t) * ARC_LEFT_X +
    2 * (1 - t) * t * ARC_MID_X +
    t * t * ARC_RIGHT_X;
  const y =
    (1 - t) * (1 - t) * ARC_Y +
    2 * (1 - t) * t * ARC_PEAK_Y +
    t * t * ARC_Y;
  return { x, y };
}

// Tangent angle at point t for plane rotation
function bezierAngle(t: number) {
  const dx = 2 * (1 - t) * (ARC_MID_X - ARC_LEFT_X) + 2 * t * (ARC_RIGHT_X - ARC_MID_X);
  const dy = 2 * (1 - t) * (ARC_PEAK_Y - ARC_Y) + 2 * t * (ARC_Y - ARC_PEAK_Y);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

const SVG_PATH = `M ${ARC_LEFT_X},${ARC_Y} Q ${ARC_MID_X},${ARC_PEAK_Y} ${ARC_RIGHT_X},${ARC_Y}`;

// Generate keyframes for plane position interpolation
const KEYFRAME_COUNT = 30;
const keyframeInputs = Array.from({ length: KEYFRAME_COUNT + 1 }, (_, i) => i / KEYFRAME_COUNT);
const keyframeX = keyframeInputs.map((t) => bezierPoint(t).x);
const keyframeY = keyframeInputs.map((t) => bezierPoint(t).y);
const keyframeAngle = keyframeInputs.map((t) => `${bezierAngle(t)}deg`);

function SkyJourney() {
  const progress = useRef(new Animated.Value(0)).current;
  const dashOffset = useRef(new Animated.Value(1)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in the whole scene
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Draw the path in
    Animated.timing(dashOffset, {
      toValue: 0,
      duration: 2000,
      delay: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // SVG props can't use native driver
    }).start();

    // Plane loops along the path
    const startPlane = () => {
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: 4500,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setTimeout(startPlane, 800);
      });
    };
    setTimeout(startPlane, 1200);
  }, []);

  const planeX = progress.interpolate({
    inputRange: keyframeInputs,
    outputRange: keyframeX,
  });
  const planeY = progress.interpolate({
    inputRange: keyframeInputs,
    outputRange: keyframeY,
  });
  const planeRotate = progress.interpolate({
    inputRange: keyframeInputs,
    outputRange: keyframeAngle,
  });

  // Path length for dash animation
  const pathLength = 600; // approximate
  const animatedDashoffset = dashOffset.interpolate({
    inputRange: [0, 1],
    outputRange: [0, pathLength],
  });

  return (
    <Animated.View style={[skyStyles.container, { opacity: fadeIn }]}>
      {/* Drifting clouds */}
      <DriftCloud top={20} size={90} duration={22000} startX={SCREEN_W * 0.6} opacity={0.5} />
      <DriftCloud top={60} size={70} duration={28000} startX={SCREEN_W * 0.1} opacity={0.4} />
      <DriftCloud top={100} size={55} duration={25000} startX={SCREEN_W * 0.75} opacity={0.35} />
      <DriftCloud top={140} size={65} duration={30000} startX={SCREEN_W * 0.3} opacity={0.3} />

      {/* SVG arc path */}
      <Svg
        width={SCREEN_W}
        height={200}
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <SvgGrad id="arcGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={colors.primary} stopOpacity="0.15" />
            <Stop offset="0.5" stopColor={colors.primary} stopOpacity="0.35" />
            <Stop offset="1" stopColor={colors.primary} stopOpacity="0.15" />
          </SvgGrad>
        </Defs>

        {/* Dashed trail */}
        <Path
          d={SVG_PATH}
          stroke="url(#arcGrad)"
          strokeWidth={2}
          strokeDasharray="6,8"
          fill="none"
        />

        {/* Origin dot */}
        <Circle cx={ARC_LEFT_X} cy={ARC_Y} r={4} fill={colors.primary} opacity={0.6} />
        {/* Destination dot */}
        <Circle cx={ARC_RIGHT_X} cy={ARC_Y} r={4} fill={colors.primary} opacity={0.6} />
      </Svg>

      {/* Airport code labels */}
      <View style={[skyStyles.codeChip, { left: ARC_LEFT_X - 20, top: ARC_Y + 12 }]}>
        <View style={skyStyles.codeDot} />
      </View>
      <View style={[skyStyles.codeChip, { left: ARC_RIGHT_X - 20, top: ARC_Y + 12 }]}>
        <View style={skyStyles.codeDot} />
      </View>

      {/* Animated plane */}
      <Animated.View
        style={[
          skyStyles.planeWrap,
          {
            transform: [
              { translateX: Animated.subtract(planeX, 16) },
              { translateY: Animated.subtract(planeY, 16) },
              { rotate: planeRotate },
            ],
          },
        ]}
      >
        <View style={skyStyles.planeCircle}>
          <Plane size={14} color="#FFFFFF" strokeWidth={2.5} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

// Simple drifting cloud (unique to this screen — not reusing AmbientHeader)
function DriftCloud({
  top,
  size,
  duration,
  startX,
  opacity,
}: {
  top: number;
  size: number;
  duration: number;
  startX: number;
  opacity: number;
}) {
  const translateX = useRef(new Animated.Value(startX)).current;

  useEffect(() => {
    const firstLeg = SCREEN_W + size - startX;
    const firstDuration = (firstLeg / (SCREEN_W + size * 2)) * duration;

    const loop = () => {
      translateX.setValue(-size);
      Animated.timing(translateX, {
        toValue: SCREEN_W + size,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(() => loop());
    };

    Animated.timing(translateX, {
      toValue: SCREEN_W + size,
      duration: firstDuration,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start(() => loop());
  }, []);

  const h = size * 0.45;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        top,
        left: 0,
        width: size,
        height: h,
        opacity,
        transform: [{ translateX }],
      }}
    >
      {/* Cloud shape built from overlapping rounded views */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: size * 0.1,
          width: size * 0.8,
          height: h * 0.5,
          borderRadius: h * 0.25,
          backgroundColor: "#FFFFFF",
        }}
      />
      <View
        style={{
          position: "absolute",
          bottom: h * 0.2,
          left: size * 0.2,
          width: size * 0.35,
          height: h * 0.7,
          borderRadius: size * 0.175,
          backgroundColor: "#FFFFFF",
        }}
      />
      <View
        style={{
          position: "absolute",
          bottom: h * 0.15,
          left: size * 0.45,
          width: size * 0.3,
          height: h * 0.55,
          borderRadius: size * 0.15,
          backgroundColor: "#FFFFFF",
        }}
      />
    </Animated.View>
  );
}

const skyStyles = StyleSheet.create({
  container: {
    width: SCREEN_W,
    height: 200,
    overflow: "visible",
  },
  planeWrap: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 32,
    height: 32,
  },
  planeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  codeChip: {
    position: "absolute",
    alignItems: "center",
    width: 40,
  },
  codeDot: {
    width: 0,
    height: 0,
  },
});

// ---------------------------------------------------------------------------
// Runway progress bar
// ---------------------------------------------------------------------------

function RunwayProgress() {
  const fill = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fill over ~90 seconds (most searches finish before 2min)
    Animated.timing(fill, {
      toValue: 1,
      duration: 90000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  }, []);

  const width = fill.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={runwayStyles.track}>
      {/* Dashes */}
      <View style={runwayStyles.dashes}>
        {Array.from({ length: 20 }).map((_, i) => (
          <View key={i} style={runwayStyles.dash} />
        ))}
      </View>
      {/* Fill overlay */}
      <Animated.View style={[runwayStyles.fill, { width }]} />
    </View>
  );
}

const runwayStyles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.neutral200,
    overflow: "hidden",
    marginHorizontal: 40,
  },
  dashes: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
  },
  dash: {
    width: 8,
    height: 2,
    borderRadius: 1,
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.primary,
    borderRadius: 3,
    opacity: 0.55,
  },
});

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function SearchingOverlay({
  origin,
  destination,
  comboCount,
  onContinueBrowsing,
}: SearchingOverlayProps) {
  const tips = useMemo(
    () => buildTips(origin, destination, comboCount),
    [origin, destination, comboCount],
  );

  const typedText = useTypewriter(tips);
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const subtitle =
    comboCount && comboCount > 1
      ? `Scanning ${comboCount} date combinations`
      : "Scanning for better deals";

  return (
    <Animated.View style={[styles.container, { opacity: fadeIn }]}>
      <MeshBackground />

      {/* ── Route header ── */}
      <View style={styles.header}>
        <View style={styles.routeRow}>
          <Text style={styles.routeCode}>{origin.toUpperCase()}</Text>
          <View style={styles.routeDivider}>
            <View style={styles.routeLine} />
            <View style={styles.routePlaneWrap}>
              <Plane size={14} color={colors.primary} strokeWidth={2.5} />
            </View>
            <View style={styles.routeLine} />
          </View>
          <Text style={styles.routeCode}>{destination.toUpperCase()}</Text>
        </View>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      {/* ── Sky Journey animation ── */}
      <View style={styles.skyWrap}>
        <SkyJourney />
      </View>

      {/* ── Runway progress ── */}
      <View style={styles.runwayWrap}>
        <RunwayProgress />
      </View>

      {/* ── Typewriter tip ── */}
      <View style={styles.tipWrap}>
        <Text style={styles.tipText}>{typedText}</Text>
      </View>

      {/* ── Note ── */}
      <Text style={styles.note}>This may take up to 2 minutes</Text>

      {/* ── Continue browsing ── */}
      {onContinueBrowsing && (
        <Pressable
          onPress={onContinueBrowsing}
          style={({ pressed }) => [
            styles.continueBtn,
            pressed && styles.continueBtnPressed,
          ]}
        >
          <Text style={styles.continueBtnText}>Continue browsing</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  // Header
  header: {
    alignItems: "center",
    marginBottom: 28,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  routeCode: {
    fontFamily: fonts.extraBold,
    fontSize: 28,
    color: colors.neutral900,
    letterSpacing: -0.5,
  },
  routeDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    width: 72,
  },
  routeLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: colors.neutral300,
  },
  routePlaneWrap: {
    transform: [{ rotate: "0deg" }],
  },
  subtitle: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.neutral500,
  },

  // Sky
  skyWrap: {
    width: SCREEN_W,
    height: 200,
    marginBottom: 20,
  },

  // Runway
  runwayWrap: {
    width: "100%",
    marginBottom: 32,
  },

  // Typewriter tip
  tipWrap: {
    minHeight: 52,
    maxWidth: 320,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  tipText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 22,
    color: colors.neutral700,
    textAlign: "center",
    letterSpacing: 0.1,
  },

  // Note
  note: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.neutral400,
    marginBottom: 4,
  },

  // Continue button
  continueBtn: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    backgroundColor: "rgba(47, 156, 244, 0.08)",
  },
  continueBtnPressed: {
    backgroundColor: "rgba(47, 156, 244, 0.15)",
    transform: [{ scale: 0.97 }],
  },
  continueBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.primary,
    letterSpacing: 0.1,
  },
});
