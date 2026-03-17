import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertCircle, CheckCircle, Info } from "lucide-react-native";
import { colors, fonts } from "../../theme";

export type ToastType = "error" | "success" | "info";

interface ToastProps {
  message: string;
  type: ToastType;
  onDismiss: () => void;
}

const ICON_MAP = { error: AlertCircle, success: CheckCircle, info: Info };
const BG_MAP = {
  error: colors.error,
  success: colors.success,
  info: colors.primary,
};

export default function Toast({ message, type, onDismiss }: ToastProps) {
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 20,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => onDismiss());
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const Icon = ICON_MAP[type];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: insets.bottom + 72, // above BottomNavBar
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={[styles.pill, { backgroundColor: BG_MAP[type] }]}>
        <Icon size={18} color="#fff" strokeWidth={2.5} />
        <Text style={styles.text} numberOfLines={2}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 999,
    alignItems: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  text: {
    color: "#fff",
    fontFamily: fonts.medium,
    fontSize: 14,
    flexShrink: 1,
  },
});
