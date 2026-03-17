import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  StyleSheet,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { fonts } from "../../theme";
import { SC } from "./splashConfig";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const NUM_COLUMNS = 7;
const PRICES_PER_COLUMN = 30;
const PRICE_HEIGHT = 34;
const COLUMN_HEIGHT = PRICES_PER_COLUMN * PRICE_HEIGHT;
const COLUMN_WIDTH = SCREEN_W / NUM_COLUMNS;

function generatePrices(): string[] {
  const prices: string[] = [];
  for (let i = 0; i < PRICES_PER_COLUMN; i++) {
    prices.push(`$${Math.floor(Math.random() * 400) + 80}`);
  }
  return prices;
}

const COLUMNS_DATA = Array.from({ length: NUM_COLUMNS }, () => generatePrices());
const SCROLL_SPEEDS = [2400, 1900, 2700, 2100, 1700, 2500, 2000];

interface Props {
  onComplete: () => void;
}

export default function PriceMatrixSplash({ onComplete }: Props) {
  const scrollAnims = useRef(COLUMNS_DATA.map(() => new Animated.Value(0))).current;
  const matrixOpacity = useRef(new Animated.Value(0)).current;
  const revealOpacity = useRef(new Animated.Value(0)).current;
  const revealScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const t = Animated.timing;

    // Fade matrix in
    t(matrixOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Start scrolling with staggered wave
    const scrollLoops = scrollAnims.map((anim, i) =>
      Animated.loop(
        t(anim, {
          toValue: -COLUMN_HEIGHT,
          duration: SCROLL_SPEEDS[i],
          easing: Easing.linear,
          useNativeDriver: true,
        })
      )
    );
    scrollLoops.forEach((loop, i) => {
      setTimeout(() => loop.start(), i * 50);
    });

    // At 1.4s: fade matrix out, reveal price + brand together
    const revealTimer = setTimeout(() => {
      // Dim matrix
      t(matrixOpacity, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }).start();

      // Show price + brand as one unit
      Animated.parallel([
        t(revealOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(revealScale, {
          toValue: 1,
          tension: 80,
          friction: 9,
          useNativeDriver: true,
        }),
      ]).start();
    }, 1400);

    const doneTimer = setTimeout(() => onComplete(), 2300);

    return () => {
      scrollLoops.forEach((l) => l.stop());
      clearTimeout(revealTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* Full-screen matrix rain */}
      <Animated.View style={[styles.columnsContainer, { opacity: matrixOpacity }]}>
        {COLUMNS_DATA.map((prices, colIdx) => (
          <View key={colIdx} style={styles.column}>
            <Animated.View style={{ transform: [{ translateY: scrollAnims[colIdx] }] }}>
              {[...prices, ...prices].map((price, i) => (
                <View key={i} style={styles.priceCell}>
                  <Animated.Text style={styles.dimPrice}>{price}</Animated.Text>
                </View>
              ))}
            </Animated.View>
          </View>
        ))}
      </Animated.View>

      {/* Edge fades */}
      <LinearGradient
        colors={["#050A14", "transparent"]}
        style={styles.fadeTop}
        pointerEvents="none"
      />
      <LinearGradient
        colors={["transparent", "#050A14"]}
        style={styles.fadeBottom}
        pointerEvents="none"
      />

      {/* Price + brand — revealed together */}
      <Animated.View
        style={[
          styles.centerLockup,
          {
            opacity: revealOpacity,
            transform: [{ scale: revealScale }],
          },
        ]}
      >
        <Animated.Text style={styles.finalPrice}>$94</Animated.Text>
        <View style={styles.brandRow}>
          <Image
            source={require("../../assets/images/this-is-way-better---the-plane-is-there--the-arc-w.png")}
            style={styles.logo}
          />
          <Animated.Text style={styles.brandName}>Airfare</Animated.Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050A14",
  },
  columnsContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    overflow: "hidden",
  },
  column: {
    width: COLUMN_WIDTH,
    height: "100%",
    overflow: "hidden",
    alignItems: "center",
  },
  priceCell: {
    height: PRICE_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  dimPrice: {
    fontFamily: fonts.light,
    fontSize: 15,
    color: "rgba(47, 156, 244, 0.18)",
    textAlign: "center",
  },
  fadeTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_H * 0.2,
    zIndex: 2,
  },
  fadeBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_H * 0.2,
    zIndex: 2,
  },
  centerLockup: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 4,
  },
  finalPrice: {
    fontFamily: fonts.extraBold,
    fontSize: 72,
    color: SC.green,
    marginBottom: 24,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  brandName: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: SC.white,
    letterSpacing: 1,
  },
});
