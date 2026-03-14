import { Pressable, View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { useHaptics } from "../../providers/HapticsProvider";

interface BackButtonProps {
  onPress?: () => void;
}

export default function BackButton({ onPress }: BackButtonProps) {
  const router = useRouter();
  const haptics = useHaptics();

  return (
    <Pressable
      style={({ pressed }) => [styles.wrapper, pressed && styles.pressed]}
      onPress={() => { haptics.light(); (onPress ?? (() => router.back()))(); }}
      hitSlop={8}
    >
      <BlurView intensity={40} tint="light" style={styles.blur}>
        <View style={styles.chevron} />
      </BlurView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: 38,
    height: 38,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  blur: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.55)",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.7)",
  },
  chevron: {
    width: 10,
    height: 10,
    borderLeftWidth: 2.5,
    borderBottomWidth: 2.5,
    borderColor: "#0F172A",
    transform: [{ rotate: "45deg" }],
    marginLeft: 2,
  },
});
