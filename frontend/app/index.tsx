import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useNotifications } from "../src/hooks/useNotifications";

export default function HomeScreen() {
  const router = useRouter();
  useNotifications();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Alerts</Text>
      <Text style={styles.subtitle}>No alerts yet</Text>

      <Pressable style={styles.button} onPress={() => router.push("/add-search")}>
        <Text style={styles.buttonText}>+ Add Search</Text>
      </Pressable>

      <Pressable
        style={[styles.button, styles.secondary]}
        onPress={() => router.push("/settings")}
      >
        <Text style={styles.buttonText}>Settings</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#0f0f23", justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "bold", color: "#fff", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#888", marginBottom: 32 },
  button: {
    backgroundColor: "#1a1a2e",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  secondary: { backgroundColor: "#16213e" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
