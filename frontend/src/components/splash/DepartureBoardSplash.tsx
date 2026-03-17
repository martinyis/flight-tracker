import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { fonts } from "../../theme";
import { SC } from "./splashConfig";

const WORD = "AIRFARE";
const SUBTITLE = "DEALS FOUND";
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const FLIP_INTERVAL = 60;
const RESOLVE_STAGGER = 180;
const SUBTITLE_STAGGER = 100;
const TILE_ENTRANCE_STAGGER = 45;

interface Props {
  onComplete: () => void;
}

// ── Individual split-flap tile ──────────────────────────────────────────────

interface TileProps {
  targetChar: string;
  resolveDelay: number;
  entranceDelay?: number;
  color?: string;
  size?: number;
}

function SplitFlapTile({
  targetChar,
  resolveDelay,
  entranceDelay = 0,
  color = SC.white,
  size = 38,
}: TileProps) {
  const [displayChar, setDisplayChar] = useState(" ");
  const [resolved, setResolved] = useState(false);
  const [visible, setVisible] = useState(entranceDelay === 0);
  const flipAnim = useRef(new Animated.Value(0)).current;
  const entranceOpacity = useRef(new Animated.Value(entranceDelay === 0 ? 1 : 0)).current;
  const entranceY = useRef(new Animated.Value(entranceDelay === 0 ? 0 : 8)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const entranceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runFlip = useCallback(() => {
    flipAnim.setValue(0);
    Animated.timing(flipAnim, {
      toValue: 1,
      duration: FLIP_INTERVAL * 0.8,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    // Staggered entrance
    entranceRef.current = setTimeout(() => {
      setVisible(true);
      Animated.parallel([
        Animated.spring(entranceOpacity, {
          toValue: 1,
          tension: 120,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(entranceY, {
          toValue: 0,
          tension: 120,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      // Start cycling characters after tile appears
      intervalRef.current = setInterval(() => {
        const randomChar = CHARS[Math.floor(Math.random() * CHARS.length)];
        setDisplayChar(randomChar);
        runFlip();
      }, FLIP_INTERVAL);
    }, entranceDelay);

    // Resolve after delay (relative to component mount, not entrance)
    timeoutRef.current = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setDisplayChar(targetChar);
      setResolved(true);

      // Dramatic resolve flip: drop forward then snap back
      flipAnim.setValue(0);
      Animated.sequence([
        Animated.timing(flipAnim, {
          toValue: 0.5,
          duration: 80,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(flipAnim, {
          toValue: 1,
          tension: 250,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();

      // Amber resolve glow
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    }, resolveDelay);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (entranceRef.current) clearTimeout(entranceRef.current);
    };
  }, []);

  // More dramatic flip: drops forward then bounces back
  const rotateX = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["0deg", "-22deg", "0deg"],
  });

  const tileW = size * 1.15;
  const tileH = size * 1.3;

  return (
    <Animated.View
      style={{
        opacity: entranceOpacity,
        transform: [{ translateY: entranceY }],
      }}
    >
      <View style={[styles.tileOuter, { width: tileW, height: tileH }]}>
        {/* Gradient background for depth */}
        <LinearGradient
          colors={["#152540", "#0D1828"]}
          style={StyleSheet.absoluteFill}
        />

        {/* Top edge light catch */}
        <View style={styles.tileTopEdge} />

        {/* Flipping character */}
        <Animated.View
          style={[
            styles.tile,
            {
              transform: [{ perspective: 250 }, { rotateX }],
            },
          ]}
        >
          <Text
            style={[
              styles.tileChar,
              {
                fontSize: size,
                color: resolved ? color : SC.midText,
              },
            ]}
          >
            {displayChar}
          </Text>
        </Animated.View>

        {/* Horizontal split line (the defining Solari detail) */}
        <View style={styles.splitLine} />
        <View style={styles.splitLineHighlight} />

        {/* Bottom edge shadow */}
        <View style={styles.tileBottomEdge} />

        {/* Amber resolve glow overlay */}
        <Animated.View
          style={[
            styles.resolveGlow,
            { opacity: glowOpacity },
          ]}
        />
      </View>
    </Animated.View>
  );
}

// ── Main splash component ───────────────────────────────────────────────────

export default function DepartureBoardSplash({ onComplete }: Props) {
  const [showSubtitle, setShowSubtitle] = useState(false);

  // Board entrance
  const boardOpacity = useRef(new Animated.Value(0)).current;
  const boardScale = useRef(new Animated.Value(0.95)).current;

  // Subtitle row
  const subtitleOpacity = useRef(new Animated.Value(0)).current;

  // Accent line
  const lineWidth = useRef(new Animated.Value(0)).current;

  // Exit
  const exitOpacity = useRef(new Animated.Value(1)).current;
  const exitScale = useRef(new Animated.Value(1)).current;
  const exitY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const t = Animated.timing;

    // Phase 1: Board frame fades in (0-250ms)
    Animated.parallel([
      t(boardOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(boardScale, {
        toValue: 1,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    // Tiles entrance is handled by each tile's entranceDelay
    // Tile cycling + resolving handled by each tile's internal timers

    // Show accent line after main word resolves
    const lineTimer = setTimeout(() => {
      t(lineWidth, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();
    }, 1600);

    // Show subtitle row
    const subtitleTimer = setTimeout(() => {
      setShowSubtitle(true);
      t(subtitleOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }, 1650);

    // Exit
    const exitTimer = setTimeout(() => {
      Animated.parallel([
        t(exitOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        t(exitScale, {
          toValue: 0.92,
          duration: 400,
          useNativeDriver: true,
        }),
        t(exitY, {
          toValue: -30,
          duration: 400,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => onComplete());
    }, 3000);

    return () => {
      clearTimeout(lineTimer);
      clearTimeout(subtitleTimer);
      clearTimeout(exitTimer);
    };
  }, []);

  const lineWidthInterp = lineWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "80%"],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.board,
          {
            opacity: Animated.multiply(boardOpacity, exitOpacity),
            transform: [
              { scale: Animated.multiply(boardScale, exitScale) },
              { translateY: exitY },
            ],
          },
        ]}
      >
        {/* Board housing / frame */}
        <View style={styles.boardFrame}>
          {/* Main word: AIRFARE */}
          <View style={styles.tileRow}>
            {WORD.split("").map((char, i) => (
              <SplitFlapTile
                key={`main-${i}`}
                targetChar={char}
                resolveDelay={300 + i * RESOLVE_STAGGER}
                entranceDelay={i * TILE_ENTRANCE_STAGGER}
              />
            ))}
          </View>

          {/* Accent line */}
          <Animated.View style={[styles.accentLine, { width: lineWidthInterp as any }]} />

          {/* Subtitle: DEALS FOUND */}
          {showSubtitle && (
            <Animated.View style={[styles.tileRow, { opacity: subtitleOpacity }]}>
              {SUBTITLE.split("").map((char, i) => (
                <SplitFlapTile
                  key={`sub-${i}`}
                  targetChar={char}
                  resolveDelay={200 + i * SUBTITLE_STAGGER}
                  color={char === " " ? SC.white : SC.green}
                  size={24}
                />
              ))}
            </Animated.View>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SC.darkBg,
    alignItems: "center",
    justifyContent: "center",
  },
  board: {
    alignItems: "center",
  },
  boardFrame: {
    backgroundColor: "#0D1525",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: "center",
    gap: 8,
    // Lift shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  tileRow: {
    flexDirection: "row",
    gap: 6,
  },
  tileOuter: {
    borderRadius: 4,
    borderWidth: 1,
    borderColor: SC.tileBorder,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  tileTopEdge: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  tileBottomEdge: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  splitLine: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  splitLineHighlight: {
    position: "absolute",
    top: "50%",
    marginTop: 1,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  tile: {
    alignItems: "center",
    justifyContent: "center",
  },
  tileChar: {
    fontFamily: fonts.extraBold,
    textAlign: "center",
  },
  resolveGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderRadius: 4,
  },
  accentLine: {
    height: 2,
    backgroundColor: SC.amber,
    borderRadius: 1,
    alignSelf: "center",
    marginVertical: 2,
  },
});
