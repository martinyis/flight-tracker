/**
 * LogoHero — dramatic logo presentation for auth screens.
 *
 * Layered glow rings, floating accent dots, and a soft radial
 * light bloom behind the app icon to make it pop on dark backgrounds.
 */

import { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const LOGO = require("../../assets/images/this-is-way-better---the-plane-is-there--the-arc-w.png");

// Small floating accent dot
function Dot({
  size,
  color,
  top,
  left,
  right,
  bottom,
  opacity = 0.5,
}: {
  size: number;
  color: string;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
  opacity?: number;
}) {
  return (
    <View
      style={[
        {
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity,
          top,
          left,
          right,
          bottom,
        },
      ]}
    />
  );
}

export default function LogoHero() {
  // Slow pulse on the outer glow
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.08,
          duration: 2400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulse]);

  return (
    <View style={styles.container}>
      {/* ---- Outer animated glow ---- */}
      <Animated.View
        style={[styles.glowOuter, { transform: [{ scale: pulse }] }]}
      >
        <LinearGradient
          colors={[
            "rgba(59,130,246,0.18)",
            "rgba(99,102,241,0.10)",
            "transparent",
          ]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* ---- Mid glow ring ---- */}
      <View style={styles.glowMid} />

      {/* ---- Orbital ring (thin decorative circle) ---- */}
      <View style={styles.orbitalRing} />

      {/* ---- Inner bright halo ---- */}
      <View style={styles.glowInner} />

      {/* ---- Floating accent dots ---- */}
      <Dot size={6} color="#60A5FA" top={18} left={28} opacity={0.6} />
      <Dot size={4} color="#818CF8" top={40} right={20} opacity={0.45} />
      <Dot size={5} color="#06B6D4" bottom={30} left={22} opacity={0.5} />
      <Dot size={3} color="#A5B4FC" bottom={20} right={35} opacity={0.4} />
      <Dot size={4} color="#60A5FA" top={60} left={12} opacity={0.3} />
      <Dot size={3} color="#38BDF8" bottom={55} right={14} opacity={0.35} />

      {/* ---- Logo image ---- */}
      <View style={styles.logoShadow}>
        <Image source={LOGO} style={styles.logo} />
      </View>
    </View>
  );
}

const LOGO_SIZE = 110;
const ORBITAL_SIZE = 180;
const GLOW_MID_SIZE = 220;
const GLOW_OUTER_SIZE = 280;

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    height: GLOW_OUTER_SIZE,
    marginTop: 20,
  },

  /* Outermost soft glow — animated */
  glowOuter: {
    position: "absolute",
    width: GLOW_OUTER_SIZE,
    height: GLOW_OUTER_SIZE,
    borderRadius: GLOW_OUTER_SIZE / 2,
    overflow: "hidden",
  },

  /* Mid-level diffuse glow */
  glowMid: {
    position: "absolute",
    width: GLOW_MID_SIZE,
    height: GLOW_MID_SIZE,
    borderRadius: GLOW_MID_SIZE / 2,
    backgroundColor: "rgba(59,130,246,0.08)",
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.08)",
  },

  /* Thin orbital ring */
  orbitalRing: {
    position: "absolute",
    width: ORBITAL_SIZE,
    height: ORBITAL_SIZE,
    borderRadius: ORBITAL_SIZE / 2,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.12)",
  },

  /* Tight inner halo */
  glowInner: {
    position: "absolute",
    width: LOGO_SIZE + 30,
    height: LOGO_SIZE + 30,
    borderRadius: (LOGO_SIZE + 30) / 2,
    backgroundColor: "rgba(59,130,246,0.12)",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 15,
  },

  /* Extra shadow wrapper for the logo */
  logoShadow: {
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },

  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.15)",
  },
});
