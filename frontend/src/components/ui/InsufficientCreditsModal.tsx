import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { fonts, colors } from "../../theme";
import { useHaptics } from "../../providers/HapticsProvider";

interface InsufficientCreditsModalProps {
  visible: boolean;
  onClose: () => void;
  needed?: number;
  balance?: number;
}

export default function InsufficientCreditsModal({
  visible,
  onClose,
  needed,
  balance,
}: InsufficientCreditsModalProps) {
  const router = useRouter();
  const haptics = useHaptics();

  const handleBuyCredits = () => {
    haptics.medium();
    onClose();
    router.push("/credits");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Not enough credits</Text>

          <Text style={styles.message}>
            {needed != null && balance != null
              ? `You need ${needed} credits but only have ${balance}. Top up to continue.`
              : "You don't have enough credits for this action. Top up to continue."}
          </Text>

          <Pressable
            onPress={handleBuyCredits}
            style={({ pressed }) => [
              styles.buyBtn,
              pressed && styles.buyBtnPressed,
            ]}
          >
            <Text style={styles.buyBtnText}>Buy Credits</Text>
          </Pressable>

          <Pressable onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  card: {
    width: "100%",
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
    alignItems: "center",
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.neutral900,
    marginBottom: 8,
  },
  message: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.neutral500,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  buyBtn: {
    width: "100%",
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  buyBtnPressed: {
    backgroundColor: colors.primaryDark,
    transform: [{ scale: 0.97 }],
  },
  buyBtnText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.white,
  },
  cancelBtn: {
    marginTop: 12,
    paddingVertical: 8,
  },
  cancelBtnText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.neutral500,
  },
});
