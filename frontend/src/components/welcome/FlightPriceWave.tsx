/**
 * FlightPriceWave — Animated dot-grid scanner illustration for auth screens.
 *
 * 7x6 grid of dots, scan line, highlighted dot with radar ping,
 * price card with countdown. Edge dots fade for "window into larger matrix" feel.
 *
 * Props:
 *   gridHeight — if provided, overrides the computed AREA_H so the parent can
 *                size the container explicitly (used when a gradient overlay is
 *                layered on top from the outside).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Dimensions, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const SCREEN_W = Dimensions.get("window").width;
const AREA_W = SCREEN_W;

const COLS = 7;
const ROWS = 6; // one extra row for the expanded layout

// ~90% of screen width, centered
const GRID_PAD_H = Math.round(SCREEN_W * 0.05);
const GRID_W = AREA_W - GRID_PAD_H * 2;
const COL_GAP = GRID_W / (COLS - 1);
const ROW_GAP = 50;
const GRID_H = ROW_GAP * (ROWS - 1);

const PAD_TOP = 16;
const PAD_BOTTOM = 16;
export const WAVE_AREA_H = PAD_TOP + GRID_H + PAD_BOTTOM;
const GRID_ORIGIN_Y = PAD_TOP;

const SCAN_DURATION = 3500;
const SCAN_PAUSE = 1000;
const COUNTDOWN_STEPS = 4;
const COUNTDOWN_INTERVAL = 700;
const HOLD_AFTER_COUNTDOWN = 1200;

const GREEN = "#22C55E";
const RED = "#EF4444";
const DIM_BLUE = "rgba(59,130,246,0.2)";
const SCAN_COLOR = "#3B82F6";
const SCAN_BAR_W = 140;

// Price card data
const CARD_DATA = [
  { dates: "Mar 7 → Mar 12", prices: ["$186", "$152", "$127", "$94"], cheap: true },
  { dates: "Mar 5 → Mar 10", prices: ["$245", "$198", "$156", "$112"], cheap: true },
  { dates: "Mar 11 → Apr 8", prices: ["$278", "$305", "$328", "$340"], cheap: false },
  { dates: "Mar 15 → Mar 18", prices: ["$167", "$134", "$118", "$103"], cheap: true },
  { dates: "Mar 9 → Mar 16", prices: ["$210", "$248", "$271", "$289"], cheap: false },
  { dates: "Mar 13 → Mar 18", prices: ["$198", "$156", "$127", "$88"], cheap: true },
  { dates: "Mar 7 → Mar 14", prices: ["$224", "$187", "$148", "$112"], cheap: true },
  { dates: "Mar 9 → Mar 14", prices: ["$203", "$172", "$143", "$108"], cheap: true },
  { dates: "Mar 11 → Mar 18", prices: ["$258", "$291", "$308", "$315"], cheap: false },
  { dates: "Mar 5 → Mar 12", prices: ["$176", "$142", "$115", "$91"], cheap: true },
];

const CHEAP_CARDS = CARD_DATA.filter((d) => d.cheap);
const EXPENSIVE_CARDS = CARD_DATA.filter((d) => !d.cheap);

// ---------------------------------------------------------------------------
// Types & helpers
// ---------------------------------------------------------------------------

type DotState = "dim" | "green" | "red";

interface DotData {
  col: number;
  row: number;
  x: number;
  y: number;
  isEdge: boolean; // first/last column — fades to suggest continuation
}

function dotRadius(state: DotState): number {
  if (state === "green") return 5;
  if (state === "red") return 3;
  return 2.5;
}

function buildGrid(): DotData[] {
  const dots: DotData[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      dots.push({
        col: c,
        row: r,
        x: GRID_PAD_H + c * COL_GAP,
        y: GRID_ORIGIN_Y + r * ROW_GAP,
        isEdge: c === 0 || c === COLS - 1,
      });
    }
  }
  return dots;
}

function initialStates(): DotState[] {
  const states: DotState[] = [];
  for (let i = 0; i < COLS * ROWS; i++) {
    const r = Math.random();
    states.push(r < 0.35 ? "dim" : r < 0.75 ? "green" : "red");
  }
  return states;
}

// ---------------------------------------------------------------------------
// Individual Dot
// ---------------------------------------------------------------------------

function GridDot({
  dot,
  state,
  scanX,
  onScanned,
  highlighted,
}: {
  dot: DotData;
  state: DotState;
  scanX: Animated.Value;
  onScanned: (idx: number) => void;
  highlighted: boolean;
}) {
  const baseOpacity = dot.isEdge ? 0.3 : state === "dim" ? 0.5 : 0.85;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(baseOpacity)).current;
  const hasBeenScanned = useRef(false);
  const idx = dot.row * COLS + dot.col;

  // Subtle opacity flicker
  useEffect(() => {
    const timer = setInterval(() => {
      if (!highlighted) {
        const max = dot.isEdge ? 0.35 : 1;
        const min = dot.isEdge ? 0.2 : 0.7;
        Animated.timing(opacityAnim, {
          toValue: min + Math.random() * (max - min),
          duration: 500 + Math.random() * 500,
          useNativeDriver: true,
        }).start();
      }
    }, 2000 + Math.random() * 2000);
    return () => clearInterval(timer);
  }, [highlighted]);

  // Brighten when state changes from dim
  useEffect(() => {
    if (state !== "dim" && !dot.isEdge) {
      Animated.timing(opacityAnim, {
        toValue: 0.85,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [state]);

  // Highlight / unhighlight
  useEffect(() => {
    if (highlighted) {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 2.8,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      const targetOpacity = dot.isEdge ? 0.3 : state === "dim" ? 0.4 : 0.5;
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: targetOpacity,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [highlighted]);

  // Scan line crossing
  useEffect(() => {
    const id = scanX.addListener(({ value }) => {
      if (!hasBeenScanned.current && Math.abs(value - dot.x) < COL_GAP * 0.4) {
        hasBeenScanned.current = true;
        onScanned(idx);

        if (!highlighted) {
          // Illuminate: brighten as the scan bar light passes over
          Animated.parallel([
            Animated.timing(opacityAnim, {
              toValue: 1,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1.3,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start(() => {
            const restOpacity = dot.isEdge ? 0.3 : state === "dim" ? 0.5 : 0.7;
            Animated.parallel([
              Animated.timing(opacityAnim, {
                toValue: restOpacity,
                duration: 400,
                useNativeDriver: true,
              }),
              Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
              }),
            ]).start();
          });
        }
      }
      if (value < 5) {
        hasBeenScanned.current = false;
      }
    });
    return () => scanX.removeListener(id);
  }, [highlighted]);

  const r = dotRadius(state);
  const dotColor = state === "dim" ? DIM_BLUE : state === "green" ? GREEN : RED;

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: dot.x - r,
        top: dot.y - r,
        width: r * 2,
        height: r * 2,
        borderRadius: r,
        backgroundColor: dotColor,
        transform: [{ scale: scaleAnim }],
        opacity: opacityAnim,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Radar Ping
// ---------------------------------------------------------------------------

function RadarPing({ x, y, color }: { x: number; y: number; color: string }) {
  const scale1 = useRef(new Animated.Value(1)).current;
  const opacity1 = useRef(new Animated.Value(0.5)).current;
  const scale2 = useRef(new Animated.Value(1)).current;
  const opacity2 = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    scale1.setValue(1);
    opacity1.setValue(0.5);
    scale2.setValue(1);
    opacity2.setValue(0.5);

    const ring1 = Animated.loop(
      Animated.parallel([
        Animated.timing(scale1, { toValue: 2.5, duration: 1500, useNativeDriver: true }),
        Animated.timing(opacity1, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    );

    const timeout = setTimeout(() => {
      Animated.loop(
        Animated.parallel([
          Animated.timing(scale2, { toValue: 2.5, duration: 1500, useNativeDriver: true }),
          Animated.timing(opacity2, { toValue: 0, duration: 1500, useNativeDriver: true }),
        ])
      ).start();
    }, 750);

    ring1.start();
    return () => {
      ring1.stop();
      clearTimeout(timeout);
    };
  }, [x, y]);

  const SIZE = 16;

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: x - SIZE / 2,
          top: y - SIZE / 2,
          width: SIZE,
          height: SIZE,
          borderRadius: SIZE / 2,
          borderWidth: 1.5,
          borderColor: color,
          transform: [{ scale: scale1 }],
          opacity: opacity1,
        }}
      />
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: x - SIZE / 2,
          top: y - SIZE / 2,
          width: SIZE,
          height: SIZE,
          borderRadius: SIZE / 2,
          borderWidth: 1.5,
          borderColor: color,
          transform: [{ scale: scale2 }],
          opacity: opacity2,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: x - 14,
          top: y - 14,
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: color,
          opacity: 0.15,
        }}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Scan Bar — layered glow beam that sweeps across the grid
// ---------------------------------------------------------------------------

function ScanBar({ scanX }: { scanX: Animated.Value }) {
  const EXTEND = 20;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: GRID_ORIGIN_Y - EXTEND,
        left: -SCAN_BAR_W / 2,
        width: SCAN_BAR_W,
        height: GRID_H + EXTEND * 2,
        transform: [{ translateX: scanX }],
      }}
    >
      {/* Subtle horizontal glow — very light wash of color */}
      <LinearGradient
        colors={[
          "rgba(59, 130, 246, 0)",       // trailing edge
          "rgba(6, 182, 212, 0.02)",     // trailing cyan hint
          "rgba(59, 130, 246, 0.04)",    // outer blue
          "rgba(59, 130, 246, 0.08)",    // inner blue
          "rgba(59, 130, 246, 0.08)",    // inner blue
          "rgba(59, 130, 246, 0.04)",    // outer blue
          "rgba(255, 255, 255, 0.015)",  // leading white hint
          "rgba(59, 130, 246, 0)",       // leading edge
        ]}
        locations={[0, 0.15, 0.33, 0.48, 0.52, 0.67, 0.82, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Top edge fade — blends glow into background smoothly */}
      <LinearGradient
        colors={["rgba(10, 22, 40, 1)", "rgba(10, 22, 40, 0)"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: EXTEND,
        }}
      />
      {/* Bottom edge fade */}
      <LinearGradient
        colors={["rgba(10, 22, 40, 0)", "rgba(10, 22, 40, 1)"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: EXTEND,
        }}
      />
      {/* Center line — fades smoothly at top and bottom */}
      <LinearGradient
        colors={[
          "rgba(255, 255, 255, 0)",
          "rgba(255, 255, 255, 0.45)",
          "rgba(255, 255, 255, 0.45)",
          "rgba(255, 255, 255, 0)",
        ]}
        locations={[0, 0.07, 0.93, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          position: "absolute",
          left: SCAN_BAR_W / 2 - 0.75,
          top: 0,
          width: 1.5,
          height: "100%",
        }}
      />
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Price Card with countdown
// ---------------------------------------------------------------------------

function PriceCard({
  dots,
  dotStates,
  highlightedIdx,
  onJump,
}: {
  dots: DotData[];
  dotStates: DotState[];
  highlightedIdx: number;
  onJump: (newIdx: number) => void;
}) {
  const [cardData, setCardData] = useState(CHEAP_CARDS[0]);
  const [priceStep, setPriceStep] = useState(0);
  const cardScale = useRef(new Animated.Value(1)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cheapIdxRef = useRef(0);
  const expensiveIdxRef = useRef(0);

  const isCheap = cardData.cheap;
  // Green/cheap dots: normal countdown speed (~4s visible)
  // Red/expensive dots: faster countdown, shorter hold (~2.1s visible)
  const countdownInterval = isCheap ? COUNTDOWN_INTERVAL : 400;
  const holdAfter = isCheap ? HOLD_AFTER_COUNTDOWN : 500;

  // Price countdown
  useEffect(() => {
    setPriceStep(0);
    let step = 0;
    const timer = setInterval(() => {
      step++;
      if (step < COUNTDOWN_STEPS) {
        setPriceStep(step);
      } else {
        clearInterval(timer);
      }
    }, countdownInterval);
    return () => clearInterval(timer);
  }, [highlightedIdx, cardData]);

  // Jump cycle — green/cheap dots stay visible longer, red/expensive move on quickly
  useEffect(() => {
    const totalTime = countdownInterval * COUNTDOWN_STEPS + holdAfter;

    const jumpTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(cardScale, { toValue: 0.85, duration: 200, useNativeDriver: true }),
        Animated.timing(cardOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        // 75% chance to pick a green/cheap dot — the visual story is about finding deals
        const wantCheap = Math.random() < 0.75;
        const targetState: DotState = wantCheap ? "green" : "red";

        let newDot: number;
        let attempts = 0;
        do {
          newDot = Math.floor(Math.random() * dots.length);
          attempts++;
        } while (
          attempts < 40 &&
          (newDot === highlightedIdx ||
            dots[newDot].isEdge ||
            dots[newDot].row >= ROWS - 2 ||
            dotStates[newDot] !== targetState)
        );

        // Fallback: any non-edge dot in visible rows
        if (attempts >= 40) {
          attempts = 0;
          do {
            newDot = Math.floor(Math.random() * dots.length);
            attempts++;
          } while (
            attempts < 20 &&
            (newDot === highlightedIdx ||
              dots[newDot].isEdge ||
              dots[newDot].row >= ROWS - 2)
          );
        }

        // Match card data to the dot's actual color
        const dotIsCheap = dotStates[newDot] !== "red";
        let nextCard;
        if (dotIsCheap) {
          cheapIdxRef.current = (cheapIdxRef.current + 1) % CHEAP_CARDS.length;
          nextCard = CHEAP_CARDS[cheapIdxRef.current];
        } else {
          expensiveIdxRef.current = (expensiveIdxRef.current + 1) % EXPENSIVE_CARDS.length;
          nextCard = EXPENSIVE_CARDS[expensiveIdxRef.current];
        }

        setCardData(nextCard);
        onJump(newDot);

        Animated.parallel([
          Animated.timing(cardScale, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(cardOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
      });
    }, totalTime);

    return () => clearTimeout(jumpTimer);
  }, [highlightedIdx, cardData]);

  const dot = dots[highlightedIdx];
  const data = cardData;
  const cheap = data.cheap;
  const currentPrice = data.prices[Math.min(priceStep, data.prices.length - 1)];
  const dotR = dotRadius(dotStates[highlightedIdx] ?? "dim");

  const CARD_W = 138;
  const CARD_H = 65;
  const POINTER_H = 14;
  const DOT_SCALED = dotR * 2.8;

  let cardX = dot.x - CARD_W / 2;
  let cardY = dot.y - CARD_H - POINTER_H - DOT_SCALED;

  if (cardX < 6) cardX = 6;
  if (cardX + CARD_W > AREA_W - 6) cardX = AREA_W - CARD_W - 6;

  const isBelow = cardY < 2;
  if (isBelow) {
    cardY = dot.y + DOT_SCALED + POINTER_H;
  }

  const borderColor = cheap ? GREEN : RED;
  const bgColor = cheap ? "rgba(22,101,52,0.92)" : "rgba(127,29,29,0.92)";

  return (
    <>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: dot.x - 0.75,
          top: isBelow ? dot.y + DOT_SCALED : cardY + CARD_H,
          width: 1.5,
          height: POINTER_H,
          backgroundColor: borderColor,
          opacity: 0.6,
        }}
      />

      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: cardX,
          top: cardY,
          width: CARD_W,
          height: CARD_H,
          borderRadius: 10,
          backgroundColor: bgColor,
          borderWidth: 1.5,
          borderColor: borderColor,
          paddingHorizontal: 14,
          paddingVertical: 10,
          justifyContent: "center",
          transform: [{ scale: cardScale }],
          opacity: cardOpacity,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
          elevation: 8,
        }}
      >
        <Text
          style={{
            fontFamily: "Outfit_400Regular",
            fontSize: 12,
            color: "rgba(255,255,255,0.8)",
            marginBottom: 4,
          }}
        >
          {data.dates}
        </Text>
        <Text
          style={{
            fontFamily: "Outfit_700Bold",
            fontSize: 22,
            color: "#FFFFFF",
          }}
        >
          {currentPrice}
        </Text>
      </Animated.View>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function FlightPriceWave() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scanX = useRef(new Animated.Value(0)).current;
  const grid = useMemo(() => buildGrid(), []);
  const [dotStates, setDotStates] = useState<DotState[]>(() => initialStates());

  // Start on a non-edge dot in the upper rows (rows 0-3) so tooltip is in the
  // visible zone above the gradient fade
  const [highlightedIdx, setHighlightedIdx] = useState(() => {
    let idx: number;
    let attempts = 0;
    do {
      idx = Math.floor(Math.random() * COLS * ROWS);
      attempts++;
    } while (attempts < 50 && (grid[idx]?.isEdge || (grid[idx]?.row ?? 0) >= ROWS - 2));
    return idx;
  });

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  // Scan sweep
  useEffect(() => {
    const runScan = () => {
      scanX.setValue(0);
      Animated.timing(scanX, {
        toValue: AREA_W,
        duration: SCAN_DURATION,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setTimeout(runScan, SCAN_PAUSE);
      });
    };
    runScan();
    return () => scanX.stopAnimation();
  }, []);

  // Color swaps
  useEffect(() => {
    const timer = setInterval(() => {
      setDotStates((prev) => {
        const next = [...prev];
        const swapCount = 2 + Math.floor(Math.random() * 3);
        for (let s = 0; s < swapCount; s++) {
          const i = Math.floor(Math.random() * next.length);
          if (next[i] !== "dim") {
            next[i] = next[i] === "green" ? "red" : "green";
          }
        }
        return next;
      });
    }, 5000 + Math.random() * 3000);
    return () => clearInterval(timer);
  }, []);

  const handleScanned = (idx: number) => {
    setDotStates((prev) => {
      const next = [...prev];
      if (next[idx] === "dim") {
        next[idx] = Math.random() < 0.65 ? "green" : "red";
      } else if (Math.random() < 0.15) {
        next[idx] = next[idx] === "green" ? "red" : "green";
      }
      return next;
    });
  };

  const highlightedDot = grid[highlightedIdx];
  const highlightedState = dotStates[highlightedIdx];
  const highlightColor = highlightedState === "red" ? RED : GREEN;

  return (
    <Animated.View style={[styles.wrapper, { opacity: fadeAnim }]}>
      <View style={styles.dotArea}>
        {grid.map((dot, i) => (
          <GridDot
            key={i}
            dot={dot}
            state={dotStates[i]}
            scanX={scanX}
            onScanned={handleScanned}
            highlighted={i === highlightedIdx}
          />
        ))}

        <RadarPing
          x={highlightedDot.x}
          y={highlightedDot.y}
          color={highlightColor}
        />

        <ScanBar scanX={scanX} />

        <PriceCard
          dots={grid}
          dotStates={dotStates}
          highlightedIdx={highlightedIdx}
          onJump={setHighlightedIdx}
        />
      </View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
  },
  dotArea: {
    width: AREA_W,
    height: WAVE_AREA_H,
  },
});
