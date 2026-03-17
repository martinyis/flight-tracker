import React, { useEffect, useRef } from "react";
import { StyleSheet, Animated, Dimensions, Easing, View, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const { width: SW, height: SH } = Dimensions.get("window");

const BG = "#0A1628";
const SCAN_BAR_W = 140;

interface Props {
  onFinish: () => void;
}

export default function AnimatedSplashGate({ onFinish }: Props) {
  const scanTx = useRef(new Animated.Value(-SCAN_BAR_W)).current;
  const scanOp = useRef(new Animated.Value(1)).current;

  // Logo + text
  const logoOp = useRef(new Animated.Value(0)).current;
  const logoSc = useRef(new Animated.Value(0.95)).current;

  // Exit
  const exitOp = useRef(new Animated.Value(1)).current;
  const exitSc = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Phase 2: scan line sweeps left → right (exits fully off-screen)
    const scanSweep = Animated.timing(scanTx, {
      toValue: SW + SCAN_BAR_W,
      duration: 1200,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    });

    // Fade scan bar out in the last 200ms of its sweep
    const scanFade = Animated.sequence([
      Animated.delay(1000),
      Animated.timing(scanOp, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]);

    // Phase 3: logo + text reveal as scan passes center
    const logoReveal = Animated.parallel([
      Animated.timing(logoOp, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(logoSc, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]);

    // Phase 4: exit
    const exit = Animated.parallel([
      Animated.timing(exitSc, {
        toValue: 1.08,
        duration: 300,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(exitOp, {
        toValue: 0,
        duration: 300,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]);

    // Scan sweep + fade + delayed logo reveal run in parallel
    const scanAndReveal = Animated.parallel([
      scanSweep,
      scanFade,
      Animated.sequence([
        Animated.delay(600),
        logoReveal,
      ]),
    ]);

    Animated.sequence([
      Animated.delay(300), // Phase 1: brief pause
      scanAndReveal,
      Animated.delay(400), // hold
      exit,
    ]).start(() => onFinish());
  }, []);

  return (
    <View style={styles.container}>
      {/* Scan bar */}
      <Animated.View
        style={[
          styles.scanBar,
          { opacity: scanOp, transform: [{ translateX: scanTx }] },
        ]}
      >
        {/* Subtle horizontal glow — blue tones */}
        <LinearGradient
          colors={[
            "rgba(59, 130, 246, 0)",
            "rgba(6, 182, 212, 0.02)",
            "rgba(59, 130, 246, 0.06)",
            "rgba(59, 130, 246, 0.10)",
            "rgba(59, 130, 246, 0.10)",
            "rgba(59, 130, 246, 0.06)",
            "rgba(255, 255, 255, 0.02)",
            "rgba(59, 130, 246, 0)",
          ]}
          locations={[0, 0.15, 0.33, 0.48, 0.52, 0.67, 0.82, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Top edge fade */}
        <LinearGradient
          colors={[`${BG}FF`, `${BG}00`]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.edgeFadeTop}
        />
        {/* Bottom edge fade */}
        <LinearGradient
          colors={[`${BG}00`, `${BG}FF`]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.edgeFadeBottom}
        />
        {/* Center white line with vertical fade */}
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
          style={styles.centerLine}
        />
      </Animated.View>

      {/* Logo + name */}
      <Animated.View
        style={[
          styles.contentWrap,
          { opacity: exitOp, transform: [{ scale: exitSc }] },
        ]}
      >
        <Animated.View
          style={[
            styles.logoRow,
            { opacity: logoOp, transform: [{ scale: logoSc }] },
          ]}
        >
          <Image
            source={require("../../assets/images/this-is-way-better---the-plane-is-there--the-arc-w.png")}
            style={styles.logo}
          />
          <Animated.Text style={styles.title}>AirFare</Animated.Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BG,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  scanBar: {
    position: "absolute",
    top: 0,
    left: -SCAN_BAR_W / 2,
    width: SCAN_BAR_W,
    height: SH,
  },
  edgeFadeTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 30,
  },
  edgeFadeBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
  },
  centerLine: {
    position: "absolute",
    left: SCAN_BAR_W / 2 - 0.75,
    top: 0,
    width: 1.5,
    height: "100%",
  },
  contentWrap: {
    alignItems: "center",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  title: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
