import { View, Pressable, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, usePathname } from "expo-router";
import { Home, Coins, User, Plus } from "lucide-react-native";
import { useHaptics } from "../../providers/HapticsProvider";

const PRIMARY = "#2F9CF4";
const PRIMARY_PRESSED = "#1A7ED4";
const INACTIVE = "#94A3B8";

export default function BottomNavBar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const haptics = useHaptics();

  const isHome = pathname === "/";
  const isCredits = pathname === "/credits";
  const isProfile = pathname === "/settings";

  const navigateTab = (path: "/" | "/credits" | "/settings") => {
    if (pathname !== path) {
      haptics.light();
      router.replace(path);
    }
  };

  return (
    <View
      style={[styles.outerWrap, { bottom: Math.max(insets.bottom, 12) + 4 }]}
    >
      <BlurView intensity={55} tint="light" style={styles.pill}>
        <View style={styles.pillInner}>
          {/* Home */}
          <Pressable
            style={({ pressed }) => [
              styles.tabBtn,
              pressed && styles.tabBtnPressed,
            ]}
            onPress={() => navigateTab("/")}
            hitSlop={8}
          >
            <Home
              size={22}
              color={isHome ? PRIMARY : INACTIVE}
              strokeWidth={2}
              fill={isHome ? PRIMARY : "transparent"}
            />
          </Pressable>

          {/* Credits */}
          <Pressable
            style={({ pressed }) => [
              styles.tabBtn,
              pressed && styles.tabBtnPressed,
            ]}
            onPress={() => navigateTab("/credits")}
            hitSlop={8}
          >
            <Coins
              size={22}
              color={isCredits ? PRIMARY : INACTIVE}
              strokeWidth={2}
              fill={isCredits ? PRIMARY : "transparent"}
            />
          </Pressable>

          {/* Profile */}
          <Pressable
            style={({ pressed }) => [
              styles.tabBtn,
              pressed && styles.tabBtnPressed,
            ]}
            onPress={() => navigateTab("/settings")}
            hitSlop={8}
          >
            <User
              size={22}
              color={isProfile ? PRIMARY : INACTIVE}
              strokeWidth={2}
              fill={isProfile ? PRIMARY : "transparent"}
            />
          </Pressable>

          {/* Add Search — blue pill inside the bar */}
          <Pressable
            style={({ pressed }) => [
              styles.addBtn,
              pressed && styles.addBtnPressed,
            ]}
            onPress={() => { haptics.medium(); router.push("/add-search"); }}
          >
            <Plus size={22} color="#FFFFFF" strokeWidth={2.5} />
          </Pressable>
        </View>
      </BlurView>
    </View>
  );
}

const PILL_HEIGHT = 56;
const ADD_SIZE = 44;

const styles = StyleSheet.create({
  outerWrap: {
    position: "absolute",
    left: 24,
    right: 24,
    alignItems: "center",
  },

  pill: {
    width: "100%",
    borderRadius: PILL_HEIGHT / 2,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 10,
  },
  pillInner: {
    height: PILL_HEIGHT,
    backgroundColor: "rgba(255, 255, 255, 0.75)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 20,
    paddingRight: 6,
    borderRadius: PILL_HEIGHT / 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.6)",
  },

  tabBtn: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBtnPressed: {
    opacity: 0.6,
  },

  addBtn: {
    width: ADD_SIZE,
    height: ADD_SIZE,
    borderRadius: ADD_SIZE / 2,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  addBtnPressed: {
    backgroundColor: PRIMARY_PRESSED,
    transform: [{ scale: 0.92 }],
  },
});
