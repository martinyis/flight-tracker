import { Text, Pressable, View, ActivityIndicator, StyleSheet } from "react-native";
import { fonts } from "../../theme";

interface AppButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary";
}

export default function AppButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
}: AppButtonProps) {
  const isDisabled = disabled || loading;

  if (variant === "secondary") {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.secondary,
          pressed && !isDisabled && styles.secondaryPressed,
          isDisabled && styles.secondaryDisabled,
        ]}
      >
        <Text
          style={[
            styles.secondaryText,
            isDisabled && styles.secondaryTextDisabled,
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.container,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={[styles.label, isDisabled && styles.labelDisabled]}>
            {label}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Primary — flat solid blue, matches app accent
  container: {
    borderRadius: 10,
    backgroundColor: "#3B82F6",
  },
  pressed: {
    backgroundColor: "#2563EB",
    transform: [{ scale: 0.97 }],
  },
  disabled: {
    backgroundColor: "#93C5FD",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  labelDisabled: {
    color: "rgba(255, 255, 255, 0.7)",
  },

  // Secondary — white fill, subtle border
  secondary: {
    paddingVertical: 18,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  secondaryPressed: {
    backgroundColor: "#F1F5F9",
    transform: [{ scale: 0.97 }],
  },
  secondaryDisabled: {
    opacity: 0.5,
  },
  secondaryText: {
    fontFamily: fonts.semiBold,
    color: "#0F172A",
    fontSize: 16,
    letterSpacing: 0.3,
  },
  secondaryTextDisabled: {
    color: "#94A3B8",
  },
});
