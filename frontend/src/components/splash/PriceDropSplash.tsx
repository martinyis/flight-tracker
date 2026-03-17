import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  StyleSheet,
  View,
} from "react-native";
import { fonts } from "../../theme";
import { SC } from "./splashConfig";

const { height: SCREEN_H } = Dimensions.get("window");

// Prices that cascade down before the final deal
const CASCADE_PRICES = ["$312", "$278", "$215", "$156", "$118"];
const FINAL_PRICE = "$94";

interface Props {
  onComplete: () => void;
}

export default function PriceDropSplash({ onComplete }: Props) {
  // ── Background warm-to-cool transition (two layers) ──
  const warmOpacity = useRef(new Animated.Value(1)).current;

  // ── Opening price ──
  const openOpacity = useRef(new Animated.Value(0)).current;
  const openY = useRef(new Animated.Value(0)).current;

  // ── Cascade prices ──
  const cascadeAnims = useRef(
    CASCADE_PRICES.map(() => ({
      opacity: new Animated.Value(0),
      y: new Animated.Value(-60),
    }))
  ).current;

  // ── Final deal price ──
  const finalOpacity = useRef(new Animated.Value(0)).current;
  const finalY = useRef(new Animated.Value(-40)).current;
  const finalScale = useRef(new Animated.Value(1.3)).current;
  const finalColorProgress = useRef(new Animated.Value(0)).current;

  // ── Brand reveal ──
  const brandOpacity = useRef(new Animated.Value(0)).current;
  const brandY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const t = Animated.timing;
    const s = Animated.spring;

    // Phase 1: Opening price fades in (0-300ms)
    const phase1 = t(openOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    });

    // Phase 2: Opening price falls away + cascade begins (300-1800ms)
    const openFall = t(openY, {
      toValue: SCREEN_H * 0.6,
      duration: 500,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    const openFade = t(openOpacity, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    });

    // Each cascade price: appear at center, fall through
    const cascadeSequence = CASCADE_PRICES.map((_, i) => {
      const anim = cascadeAnims[i];
      return Animated.sequence([
        Animated.delay(i * 220),
        Animated.parallel([
          // Fade in
          t(anim.opacity, {
            toValue: 0.7 - i * 0.08,
            duration: 150,
            useNativeDriver: true,
          }),
          // Slide down from above
          t(anim.y, {
            toValue: 0,
            duration: 200,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        // Then fall away
        Animated.parallel([
          t(anim.opacity, {
            toValue: 0,
            duration: 350,
            useNativeDriver: true,
          }),
          t(anim.y, {
            toValue: SCREEN_H * 0.4,
            duration: 450,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]);
    });

    // Background warm-to-cool shift (starts midway through cascade)
    const bgShift = t(warmOpacity, {
      toValue: 0,
      duration: 1200,
      useNativeDriver: true,
    });

    // Phase 3: Final price lands (1800ms)
    const finalReveal = Animated.parallel([
      t(finalOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      s(finalY, {
        toValue: 0,
        tension: 120,
        friction: 7,
        useNativeDriver: true,
      }),
      s(finalScale, {
        toValue: 1,
        tension: 120,
        friction: 8,
        useNativeDriver: true,
      }),
    ]);

    // Color to green
    const colorShift = t(finalColorProgress, {
      toValue: 1,
      duration: 400,
      useNativeDriver: false,
    });

    // Phase 4: Brand reveal (2200ms)
    const brandReveal = Animated.parallel([
      t(brandOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      t(brandY, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

    // Orchestrate everything
    Animated.sequence([
      // Phase 1: Show opening price
      phase1,
      // Phase 2: Drop it + cascade
      Animated.parallel([
        Animated.parallel([openFall, openFade]),
        Animated.stagger(0, cascadeSequence),
        Animated.sequence([Animated.delay(400), bgShift]),
      ]),
      // Phase 3: Final price lands
      Animated.parallel([finalReveal, colorShift]),
      // Brief pause
      Animated.delay(200),
      // Phase 4: Brand
      brandReveal,
      // Done
      Animated.delay(200),
    ]).start(() => onComplete());

    // No cleanup needed — animations auto-stop on unmount
  }, []);

  const finalColor = finalColorProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [SC.white, SC.green],
  });

  return (
    <View style={styles.container}>
      {/* Warm amber background layer (fades out to reveal cool blue) */}
      <Animated.View style={[styles.warmBg, { opacity: warmOpacity }]} />

      {/* Opening price "$347" */}
      <Animated.Text
        style={[
          styles.price,
          styles.openingPrice,
          {
            opacity: openOpacity,
            transform: [{ translateY: openY }],
          },
        ]}
      >
        $347
      </Animated.Text>

      {/* Cascading intermediate prices */}
      {CASCADE_PRICES.map((price, i) => (
        <Animated.Text
          key={price}
          style={[
            styles.price,
            styles.cascadePrice,
            {
              fontSize: 52 - i * 3,
              opacity: cascadeAnims[i].opacity,
              transform: [{ translateY: cascadeAnims[i].y }],
            },
          ]}
        >
          {price}
        </Animated.Text>
      ))}

      {/* Final deal price — outer View for native-driven transforms,
           inner Text for JS-driven color interpolation */}
      <Animated.View
        style={[
          styles.finalWrap,
          {
            opacity: finalOpacity,
            transform: [
              { translateY: finalY },
              { scale: finalScale },
            ],
          },
        ]}
      >
        <Animated.Text
          style={[styles.price, styles.finalPrice, { color: finalColor }]}
        >
          {FINAL_PRICE}
        </Animated.Text>
      </Animated.View>

      {/* Brand lockup */}
      <Animated.View
        style={[
          styles.brand,
          {
            opacity: brandOpacity,
            transform: [{ translateY: brandY }],
          },
        ]}
      >
        <Image
          source={require("../../assets/images/this-is-way-better---the-plane-is-there--the-arc-w.png")}
          style={styles.logo}
        />
        <Animated.Text style={styles.brandName}>Airfare</Animated.Text>
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
  warmBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SC.warmBg,
  },
  price: {
    position: "absolute",
    fontFamily: fonts.extraBold,
    color: SC.white,
    textAlign: "center",
  },
  openingPrice: {
    fontSize: 64,
  },
  cascadePrice: {
    color: "rgba(255,255,255,0.6)",
  },
  finalWrap: {
    position: "absolute",
  },
  finalPrice: {
    fontSize: 72,
  },
  brand: {
    position: "absolute",
    bottom: SCREEN_H * 0.22,
    alignItems: "center",
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    marginBottom: 12,
  },
  brandName: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: SC.white,
    letterSpacing: 1,
  },
});
