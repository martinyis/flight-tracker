import React, { useCallback, useRef, useState } from "react";
import { Animated, StatusBar, StyleSheet, View } from "react-native";
import { ACTIVE_SPLASH, SPLASH_FADE_OUT_MS, type SplashVariant } from "./splashConfig";
import PriceDropSplash from "./PriceDropSplash";
import DepartureBoardSplash from "./DepartureBoardSplash";
import PriceMatrixSplash from "./PriceMatrixSplash";
import IconSplash from "./IconSplash";

function getSplashComponent(variant: SplashVariant) {
  switch (variant) {
    case "priceDrop":
      return PriceDropSplash;
    case "departureBoard":
      return DepartureBoardSplash;
    case "priceMatrix":
      return PriceMatrixSplash;
    case "icon":
      return IconSplash;
  }
}

interface Props {
  children: React.ReactNode;
}

export default function AnimatedSplashGate({ children }: Props) {
  const [splashDone, setSplashDone] = useState(false);
  const fadeOut = useRef(new Animated.Value(1)).current;

  const handleComplete = useCallback(() => {
    Animated.timing(fadeOut, {
      toValue: 0,
      duration: SPLASH_FADE_OUT_MS,
      useNativeDriver: true,
    }).start(() => setSplashDone(true));
  }, []);

  const SplashComponent = getSplashComponent(ACTIVE_SPLASH);

  return (
    <View style={styles.root}>
      {children}
      {!splashDone && (
        <Animated.View style={[styles.overlay, { opacity: fadeOut }]}>
          <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
          <SplashComponent onComplete={handleComplete} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
});
