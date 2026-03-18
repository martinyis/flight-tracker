import { useEffect, useRef } from "react";
import { View, Text, Pressable, Animated, Easing, StyleSheet } from "react-native";
import { X, Check } from "lucide-react-native";
import { usePendingSearch } from "../providers/PendingSearchProvider";
import { useHaptics } from "../providers/HapticsProvider";
import { fonts } from "../theme";

export default function PendingSearchBanner() {
  const { pending, viewResult, dismiss } = usePendingSearch();
  const haptics = useHaptics();

  // Slide-in animation
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Pulsing dot for searching state
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (pending) {
      slideAnim.setValue(-20);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [pending?.status]);

  // Pulsing dot animation
  useEffect(() => {
    if (pending?.status === "searching") {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      animation.start();
      return () => animation.stop();
    }
  }, [pending?.status]);

  // Auto-dismiss completed banner after 30s
  useEffect(() => {
    if (pending?.status === "completed") {
      const timer = setTimeout(dismiss, 30_000);
      return () => clearTimeout(timer);
    }
  }, [pending?.status]);

  if (!pending) return null;

  const isSearching = pending.status === "searching";
  const isCompleted = pending.status === "completed";
  const isError = pending.status === "error";

  return (
    <Animated.View
      style={[
        styles.container,
        isSearching && styles.searchingBg,
        isCompleted && styles.completedBg,
        isError && styles.errorBg,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <Pressable
        style={styles.content}
        onPress={() => {
          if (isCompleted) {
            haptics.light();
            viewResult();
          }
        }}
        disabled={!isCompleted}
      >
        <View style={styles.row}>
          {/* Status indicator */}
          {isSearching && (
            <Animated.View
              style={[styles.dot, styles.blueDot, { opacity: pulseAnim }]}
            />
          )}
          {isCompleted && (
            <View style={[styles.dot, styles.greenDot]}>
              <Check size={10} color="#FFFFFF" strokeWidth={3} />
            </View>
          )}
          {isError && <View style={[styles.dot, styles.redDot]} />}

          {/* Text */}
          <View style={styles.textWrap}>
            {isSearching && (
              <>
                <Text style={styles.title}>
                  Scanning for better deals {pending.origin} → {pending.destination}...
                </Text>
                <Text style={styles.subtitle}>
                  We'll let you know when it's ready
                </Text>
              </>
            )}
            {isCompleted && (
              <>
                <Text style={[styles.title, styles.greenTitle]}>
                  Search complete!
                </Text>
                <Text style={[styles.subtitle, styles.greenSubtitle]}>
                  {pending.origin} → {pending.destination} · Tap to view
                  results
                </Text>
              </>
            )}
            {isError && (
              <>
                <Text style={[styles.title, styles.redTitle]}>
                  Search failed
                </Text>
                <Text style={styles.subtitle}>
                  {pending.errorMessage ?? "Something went wrong"}
                </Text>
              </>
            )}
          </View>

          {/* Dismiss button for error */}
          {isError && (
            <Pressable
              onPress={() => {
                haptics.light();
                dismiss();
              }}
              hitSlop={12}
              style={styles.dismissBtn}
            >
              <X size={16} color="#EF4444" strokeWidth={2} />
            </Pressable>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  content: {
    padding: 16,
  },
  searchingBg: {
    backgroundColor: "rgba(47, 156, 244, 0.06)",
    borderColor: "rgba(47, 156, 244, 0.15)",
  },
  completedBg: {
    backgroundColor: "rgba(34, 197, 94, 0.06)",
    borderColor: "rgba(34, 197, 94, 0.15)",
  },
  errorBg: {
    backgroundColor: "rgba(239, 68, 68, 0.06)",
    borderColor: "rgba(239, 68, 68, 0.15)",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  blueDot: {
    backgroundColor: "#2F9CF4",
  },
  greenDot: {
    backgroundColor: "#22C55E",
  },
  redDot: {
    backgroundColor: "#EF4444",
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: "#0F172A",
    marginBottom: 2,
  },
  greenTitle: {
    color: "#16A34A",
  },
  redTitle: {
    color: "#DC2626",
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: "#64748B",
  },
  greenSubtitle: {
    color: "#22C55E",
  },
  dismissBtn: {
    padding: 4,
  },
});
