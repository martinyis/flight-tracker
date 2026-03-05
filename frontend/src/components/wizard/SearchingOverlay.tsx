import { useEffect, useRef, useState } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import { fonts } from "../../utils/fonts";
import { LinearGradient } from "expo-linear-gradient";

interface SearchingOverlayProps {
  origin: string;
  destination: string;
}

const MESSAGES = [
  "Checking departure dates...",
  "Finding the best prices...",
  "Comparing airlines...",
  "Almost there...",
];

export default function SearchingOverlay({
  origin,
  destination,
}: SearchingOverlayProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const planeX = useRef(new Animated.Value(-50)).current;
  const planeOpacity = useRef(new Animated.Value(0)).current;
  const messageFade = useRef(new Animated.Value(1)).current;

  // Plane animation
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(planeX, {
          toValue: -50,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(planeOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(planeX, {
            toValue: 300,
            duration: 2500,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(planeOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  // Message cycle with fade
  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(messageFade, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setMessageIndex((i) => (i + 1) % MESSAGES.length);
        Animated.timing(messageFade, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      {/* Plane track */}
      <View style={styles.planeTrack}>
        <View style={styles.trackLine} />
        <Animated.View
          style={[
            styles.planeWrap,
            {
              transform: [{ translateX: planeX }],
              opacity: planeOpacity,
            },
          ]}
        >
          <LinearGradient
            colors={["#60A5FA", "#3B82F6"]}
            style={styles.planeCircle}
          >
            <Text style={styles.planeEmoji}>✈</Text>
          </LinearGradient>
        </Animated.View>
      </View>

      {/* Route */}
      <Text style={styles.routeText}>
        Searching {origin.toUpperCase()} → {destination.toUpperCase()}
      </Text>

      {/* Rotating message with fade */}
      <Animated.Text style={[styles.message, { opacity: messageFade }]}>
        {MESSAGES[messageIndex]}
      </Animated.Text>

      {/* Note */}
      <Text style={styles.note}>This may take up to 2 minutes</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  planeTrack: {
    width: 280,
    height: 50,
    justifyContent: "center",
    marginBottom: 36,
    overflow: "hidden",
  },
  trackLine: {
    position: "absolute",
    left: 30,
    right: 30,
    height: 1,
    backgroundColor: "#E2E8F0",
    top: 24,
  },
  planeWrap: {
    position: "absolute",
  },
  planeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  planeEmoji: {
    fontSize: 16,
    color: "#FFFFFF",
  },
  routeText: {
    fontFamily: fonts.extraBold,
    fontSize: 24,
    color: "#0F172A",
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  message: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: "#64748B",
    marginBottom: 32,
    height: 20,
  },
  note: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: "#94A3B8",
  },
});
