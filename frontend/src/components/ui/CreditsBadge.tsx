import { TouchableOpacity, Text, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useCredits } from "../../providers/CreditsProvider";
import { fonts } from "../../theme";
import { Coins } from "lucide-react-native";

export default function CreditsBadge() {
  const { balance } = useCredits();
  const router = useRouter();

  if (balance == null) return null;

  return (
    <TouchableOpacity
      style={styles.badge}
      onPress={() => router.push("/credits" as any)}
      activeOpacity={0.7}
    >
      <View style={styles.coin}>
        <Coins size={12} color="#FFFFFF" strokeWidth={2.5} />
      </View>
      <Text style={styles.text}>{balance}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    gap: 5,
  },
  coin: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#F59E0B",
    justifyContent: "center",
    alignItems: "center",
  },
  coinText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: "#FFF",
  },
  text: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: "#1E40AF",
  },
});
