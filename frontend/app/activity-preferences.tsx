import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  StatusBar,
  Animated,
  Easing,
  Alert,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import {
  ArrowLeft,
  Search,
  Coins,
  Smartphone,
  Bell,
} from "lucide-react-native";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useHaptics } from "../src/providers/HapticsProvider";
import { registerForPushNotifications } from "../src/lib/utils/notifications";
import MeshBackground from "../src/components/ui/MeshBackground";
import { fonts } from "../src/theme";
import api from "../src/lib/api/client";

const C = {
  primary: "#2F9CF4",
  warm500: "#F59E0B",
  n900: "#0F172A",
  n500: "#64748B",
  n400: "#94A3B8",
  n300: "#CBD5E1",
  divider: "rgba(148, 163, 184, 0.15)",
};

// ---------------------------------------------------------------------------
// Toggle switch
// ---------------------------------------------------------------------------

function ToggleSwitch({ value, onToggle }: { value: boolean; onToggle: () => void }) {
  const knobX = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(knobX, {
      toValue: value ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const translateX = knobX.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 22],
  });

  return (
    <Pressable
      onPress={onToggle}
      style={[toggleS.track, value && toggleS.trackOn]}
      hitSlop={8}
    >
      <Animated.View style={[toggleS.knob, { transform: [{ translateX }] }]} />
    </Pressable>
  );
}

const toggleS = StyleSheet.create({
  track: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.n300,
    justifyContent: "center",
  },
  trackOn: { backgroundColor: C.primary },
  knob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function ActivityPreferencesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const haptics = useHaptics();

  const [activeSearches, setActiveSearches] = useState<number | null>(null);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Fetch profile stats
  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const res = await api.get("/auth/me");
          setActiveSearches(res.data.activeSearches);
          setCreditBalance(res.data.creditBalance);
        } catch {
          // silent
        }
      })();
    }, [])
  );

  // Notifications state
  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem("notifications_enabled");
      if (stored === "false") {
        setNotificationsEnabled(false);
        return;
      }
      const { status } = await Notifications.getPermissionsAsync();
      setNotificationsEnabled(status === "granted" && stored !== "false");
    })();
  }, []);

  const handleToggleNotifications = async () => {
    haptics.light();
    if (notificationsEnabled) {
      setNotificationsEnabled(false);
      AsyncStorage.setItem("notifications_enabled", "false");
      try {
        await api.post("/auth/push-token", { pushToken: "" });
      } catch {
        // best-effort
      }
    } else {
      const pushToken = await registerForPushNotifications();
      if (pushToken) {
        setNotificationsEnabled(true);
        AsyncStorage.setItem("notifications_enabled", "true");
        try {
          await api.post("/auth/push-token", { pushToken });
        } catch {
          // best-effort
        }
      } else {
        Alert.alert(
          "Notifications Disabled",
          "Enable notifications in your device settings to receive price drop alerts.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
      }
    }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <MeshBackground />

      <View style={[s.safe, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={s.header}>
          <Pressable
            onPress={() => { haptics.light(); router.back(); }}
            hitSlop={12}
            style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.6 }]}
          >
            <ArrowLeft size={22} color={C.n900} strokeWidth={2} />
          </Pressable>
          <Text style={s.headerTitle}>Activity & Preferences</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Activity */}
        <Text style={s.sectionLabel}>ACTIVITY</Text>
        <View style={s.row}>
          <View style={[s.iconWrap, { backgroundColor: `${C.warm500}12` }]}>
            <Search size={18} color={C.warm500} strokeWidth={2} />
          </View>
          <View style={s.labelWrap}>
            <Text style={s.label}>Active searches</Text>
            <Text style={s.value}>
              {activeSearches != null ? `${activeSearches} tracking` : "..."}
            </Text>
          </View>
        </View>
        <View style={s.divider} />
        <View style={s.row}>
          <View style={[s.iconWrap, { backgroundColor: `${C.warm500}12` }]}>
            <Coins size={18} color={C.warm500} strokeWidth={2} />
          </View>
          <View style={s.labelWrap}>
            <Text style={s.label}>Credits balance</Text>
            <Text style={s.value}>
              {creditBalance != null ? `${creditBalance} credits` : "..."}
            </Text>
          </View>
        </View>

        {/* Preferences */}
        <Text style={s.sectionLabel}>PREFERENCES</Text>
        <View style={s.row}>
          <View style={[s.iconWrap, { backgroundColor: `${C.primary}12` }]}>
            <Smartphone size={18} color={C.primary} strokeWidth={2} />
          </View>
          <View style={s.labelWrap}>
            <Text style={s.label}>Haptic Feedback</Text>
            <Text style={s.value}>Vibration on interactions</Text>
          </View>
          <ToggleSwitch
            value={haptics.enabled}
            onToggle={() => {
              haptics.light();
              haptics.setEnabled(!haptics.enabled);
            }}
          />
        </View>
        <View style={s.divider} />
        <View style={s.row}>
          <View style={[s.iconWrap, { backgroundColor: `${C.primary}12` }]}>
            <Bell size={18} color={C.primary} strokeWidth={2} />
          </View>
          <View style={s.labelWrap}>
            <Text style={s.label}>Notifications</Text>
            <Text style={s.value}>Price drop alerts</Text>
          </View>
          <ToggleSwitch
            value={notificationsEnabled}
            onToggle={handleToggleNotifications}
          />
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#DCEEFB" },
  safe: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: C.n900,
    letterSpacing: -0.4,
  },

  sectionLabel: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: C.n400,
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    minHeight: 52,
    gap: 14,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  labelWrap: { flex: 1 },
  label: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: C.n900,
    letterSpacing: -0.1,
  },
  value: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: C.n500,
    marginTop: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.divider,
    marginLeft: 70,
    marginRight: 20,
  },
});
