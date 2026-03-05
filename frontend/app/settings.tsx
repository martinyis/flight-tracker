import { View, Text, Pressable, SafeAreaView, StyleSheet } from "react-native";
import { useAuth } from "../src/context/AuthContext";
import BackButton from "../src/components/BackButton";
import { fonts } from "../src/utils/fonts";

export default function SettingsScreen() {
  const { logout } = useAuth();

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        {/* Nav row */}
        <View style={styles.navRow}>
          <BackButton />
          <Text style={styles.screenTitle}>Settings</Text>
          <View style={{ width: 38 }} />
        </View>

        <View style={styles.content}>
          <Text style={styles.subtitle}>
            Notification preferences will go here
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.logoutButton,
              pressed && styles.logoutButtonPressed,
            ]}
            onPress={logout}
          >
            <Text style={styles.logoutText}>Sign Out</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F0F6FF",
  },
  safeArea: {
    flex: 1,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  screenTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: "#0F172A",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: "#64748B",
    marginBottom: 32,
  },
  logoutButton: {
    backgroundColor: "#FEF2F2",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  logoutButtonPressed: {
    backgroundColor: "#FEE2E2",
    transform: [{ scale: 0.98 }],
  },
  logoutText: {
    fontFamily: fonts.semiBold,
    color: "#DC2626",
    fontSize: 16,
  },
});
