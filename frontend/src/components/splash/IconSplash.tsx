import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  View,
} from "react-native";
import Svg, { Path, Circle, G } from "react-native-svg";
import { fonts } from "../../theme";

const { width: W, height: H } = Dimensions.get("window");
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ── Logo dimensions (matching the app icon exactly) ──
const CX = W / 2;
const CY = H / 2 - 40; // slightly above center

// Dot grid: 5 columns × 5 rows, staircase shape
const DOT_SPACING = 26;
const DOT_R = 4.5;
const GRID_X = CX - 52; // left edge of grid (col 0)
const GRID_Y = CY + 8; // top edge of grid (row 0)

// Grid layout matching the icon:
// Row 0:     · · ·     (cols 2,3,4)
// Row 1:   · · · ·     (cols 1,2,3,4)
// Row 2: · · · · ·     (cols 0,1,2,3,4)
// Row 3: · · · · ·     (cols 0,1,2,3,4)
// Row 4: · · ·  🟢     (cols 0,1,2 white, col 3 green)
const GRID_LAYOUT: { row: number; col: number; green?: boolean }[] = [
  // Row 0
  { row: 0, col: 2 }, { row: 0, col: 3 }, { row: 0, col: 4 },
  // Row 1
  { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 }, { row: 1, col: 4 },
  // Row 2
  { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 3 }, { row: 2, col: 4 },
  // Row 3
  { row: 3, col: 0 }, { row: 3, col: 1 }, { row: 3, col: 2 }, { row: 3, col: 3 }, { row: 3, col: 4 },
  // Row 4
  { row: 4, col: 0 }, { row: 4, col: 1 }, { row: 4, col: 2 },
  { row: 4, col: 3, green: true },
];

// Convert grid positions to screen coordinates
const DOT_TARGETS = GRID_LAYOUT.map((d) => ({
  x: GRID_X + d.col * DOT_SPACING,
  y: GRID_Y + d.row * DOT_SPACING,
  green: d.green ?? false,
}));

const DOT_COUNT = DOT_TARGETS.length;

// ── Arc: clean semicircle from bottom-left to top-right ──
// Start: left of grid, slightly above bottom
// End: top-right, where the plane will be
const ARC_START_X = GRID_X - 12;
const ARC_START_Y = GRID_Y + 1 * DOT_SPACING;
const ARC_END_X = GRID_X + 5.5 * DOT_SPACING;
const ARC_END_Y = GRID_Y - 2.5 * DOT_SPACING;

// Arc radius — large enough for a smooth sweep
const ARC_RX = 100;
const ARC_RY = 100;
// SVG arc: M start A rx ry rotation large-arc-flag sweep-flag end
const ARC_D = `M ${ARC_START_X} ${ARC_START_Y} A ${ARC_RX} ${ARC_RY} 0 0 1 ${ARC_END_X} ${ARC_END_Y}`;
const ARC_LENGTH = 220;

// ── Plane position (at the end of the arc) ──
const PLANE_X = ARC_END_X;
const PLANE_Y = ARC_END_Y;
// Airplane silhouette path (top-down, nose pointing up)
const PLANE_PATH = "M 0,-10 L 2.5,-5 L 10,-1 L 3,1 L 2.5,7 L 5,10 L 1.5,9 L 0,10.5 L -1.5,9 L -5,10 L -2.5,7 L -3,1 L -10,-1 L -2.5,-5 Z";

// ── Random scatter positions for Phase 1 ──
function randomScatter() {
  return {
    x: W * 0.2 + Math.random() * W * 0.6,
    y: H * 0.25 + Math.random() * H * 0.45,
  };
}
const SCATTER = DOT_TARGETS.map(() => randomScatter());

interface Props {
  onComplete: () => void;
}

export default function IconSplash({ onComplete }: Props) {
  // Dot animations
  const dotX = useRef(DOT_TARGETS.map((_, i) => new Animated.Value(SCATTER[i].x))).current;
  const dotY = useRef(DOT_TARGETS.map((_, i) => new Animated.Value(SCATTER[i].y))).current;
  const dotOpacity = useRef(DOT_TARGETS.map(() => new Animated.Value(0))).current;

  // Arc
  const arcDash = useRef(new Animated.Value(ARC_LENGTH)).current;
  const arcOpacity = useRef(new Animated.Value(0)).current;

  // Plane
  const planeOpacity = useRef(new Animated.Value(0)).current;
  const planeScale = useRef(new Animated.Value(0.3)).current;

  // Green dot reveal
  const greenProgress = useRef(new Animated.Value(0)).current;

  // Text
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textY = useRef(new Animated.Value(12)).current;

  // Exit
  const exitScale = useRef(new Animated.Value(1)).current;
  const exitOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const t = Animated.timing;

    // ── Phase 1 (0–400ms): Dots appear scattered ──
    const phase1 = Animated.stagger(
      35,
      dotOpacity.map((op) =>
        t(op, { toValue: 1, duration: 200, useNativeDriver: false })
      )
    );

    // ── Phase 2 (400–1200ms): Dots snap into logo grid ──
    const phase2 = Animated.parallel(
      DOT_TARGETS.map((target, i) =>
        Animated.parallel([
          Animated.spring(dotX[i], {
            toValue: target.x,
            tension: 50,
            friction: 7,
            useNativeDriver: false,
          }),
          Animated.spring(dotY[i], {
            toValue: target.y,
            tension: 50,
            friction: 7,
            useNativeDriver: false,
          }),
        ])
      )
    );

    // ── Phase 3 (1200–1800ms): Arc draws, plane appears, green dot, text ──
    const phase3 = Animated.parallel([
      // Arc line draws
      t(arcOpacity, { toValue: 1, duration: 80, useNativeDriver: false }),
      t(arcDash, {
        toValue: 0,
        duration: 350,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      // Plane appears with scale-up
      Animated.sequence([
        Animated.delay(250),
        Animated.parallel([
          t(planeOpacity, { toValue: 1, duration: 200, useNativeDriver: false }),
          Animated.spring(planeScale, {
            toValue: 1,
            tension: 150,
            friction: 8,
            useNativeDriver: false,
          }),
        ]),
      ]),
      // Green dot color
      Animated.sequence([
        Animated.delay(200),
        t(greenProgress, { toValue: 1, duration: 300, useNativeDriver: false }),
      ]),
      // Text
      Animated.sequence([
        Animated.delay(200),
        Animated.parallel([
          t(textOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          t(textY, {
            toValue: 0,
            duration: 400,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]);

    // ── Phase 4 (1800–2500ms): Hold + zoom-fade out ──
    const phase4 = Animated.sequence([
      Animated.delay(400),
      Animated.parallel([
        t(exitScale, {
          toValue: 1.15,
          duration: 400,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        t(exitOpacity, {
          toValue: 0,
          duration: 400,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]);

    Animated.sequence([phase1, phase2, phase3, phase4]).start(() =>
      onComplete()
    );
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: exitOpacity,
            transform: [{ scale: exitScale }],
          },
        ]}
      >
        {/* SVG layer: arc + plane */}
        <Svg
          width={W}
          height={H}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          {/* Arc */}
          <AnimatedPath
            d={ARC_D}
            stroke="rgba(255,255,255,0.9)"
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${ARC_LENGTH}`}
            strokeDashoffset={arcDash}
            opacity={arcOpacity}
          />

          {/* Plane silhouette */}
          <G
            transform={`translate(${PLANE_X}, ${PLANE_Y}) rotate(35)`}
          >
            <AnimatedPath
              d={PLANE_PATH}
              fill="white"
              opacity={planeOpacity}
              scale={planeScale}
            />
          </G>
        </Svg>

        {/* Dots */}
        {DOT_TARGETS.map((target, i) => {
          const bgColor = target.green
            ? greenProgress.interpolate({
                inputRange: [0, 1],
                outputRange: ["#FFFFFF", "#22C55E"],
              })
            : undefined;

          return (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                {
                  left: Animated.subtract(dotX[i], new Animated.Value(DOT_R)),
                  top: Animated.subtract(dotY[i], new Animated.Value(DOT_R)),
                  opacity: dotOpacity[i],
                  ...(bgColor ? { backgroundColor: bgColor } : {}),
                },
              ]}
            />
          );
        })}

        {/* Brand text */}
        <Animated.Text
          style={[
            styles.brandText,
            {
              opacity: textOpacity,
              transform: [{ translateY: textY }],
            },
          ]}
        >
          Skylens
        </Animated.Text>
      </Animated.View>
    </View>
  );
}

const DOT_DIAM = DOT_R * 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#3B82F6",
  },
  content: {
    flex: 1,
  },
  dot: {
    position: "absolute",
    width: DOT_DIAM,
    height: DOT_DIAM,
    borderRadius: DOT_R,
    backgroundColor: "#FFFFFF",
  },
  brandText: {
    position: "absolute",
    bottom: H * 0.32,
    alignSelf: "center",
    fontFamily: fonts.bold,
    fontSize: 30,
    color: "#FFFFFF",
    letterSpacing: 2,
  },
});
