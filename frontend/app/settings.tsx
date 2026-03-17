import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  Alert,
  StyleSheet,
  StatusBar,
  Animated,
  Easing,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import BottomSheet, {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetTextInput,
  BottomSheetBackdrop,
} from "@gorhom/bottom-sheet";
import {
  Mail,
  Calendar,
  Search,
  Coins,
  ChevronRight,
  Bell,
  Shield,
  LogOut,
  UserPen,
  Trash2,
  X,
  LifeBuoy,
  FileText,
  ScrollText,
  Smartphone,
} from "lucide-react-native";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../src/providers/AuthProvider";
import { useHaptics } from "../src/providers/HapticsProvider";
import { registerForPushNotifications } from "../src/lib/utils/notifications";
import MeshBackground from "../src/components/ui/MeshBackground";
import BottomNavBar from "../src/components/ui/BottomNavBar";
import { fonts } from "../src/theme";
import api from "../src/lib/api/client";

// ---------------------------------------------------------------------------
// Design system colors
// ---------------------------------------------------------------------------

const C = {
  primary: "#2F9CF4",
  primaryDark: "#1A7ED4",
  primary100: "#E0F2FE",
  primary300: "#8FD0FA",
  warm500: "#F59E0B",
  n900: "#0F172A",
  n700: "#334155",
  n500: "#64748B",
  n400: "#94A3B8",
  n300: "#CBD5E1",
  n200: "#E2E8F0",
  divider: "rgba(148, 163, 184, 0.15)",
  error500: "#EF4444",
  error600: "#DC2626",
  errorBg: "rgba(239, 68, 68, 0.06)",
  errorBorder: "rgba(239, 68, 68, 0.2)",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserProfile {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  provider: "google" | "apple" | "unknown";
  creditBalance: number;
  createdAt: string;
  totalSearches: number;
  activeSearches: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(
  firstName: string | null,
  lastName: string | null,
  email: string
): string {
  if (firstName && lastName) {
    return (firstName[0] + lastName[0]).toUpperCase();
  }
  if (firstName) return firstName.substring(0, 2).toUpperCase();
  const local = email.split("@")[0];
  if (local.length <= 2) return local.toUpperCase();
  return local.substring(0, 2).toUpperCase();
}

function getDisplayName(
  firstName: string | null,
  lastName: string | null
): string | null {
  if (firstName && lastName) return `${firstName} ${lastName}`;
  if (firstName) return firstName;
  if (lastName) return lastName;
  return null;
}

function formatMemberSince(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function getProviderLabel(p: string): string {
  if (p === "google") return "Google";
  if (p === "apple") return "Apple";
  return "Email";
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

function LoadingPulse() {
  const pulse = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.35,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    a.start();
    return () => a.stop();
  }, []);

  return (
    <Animated.View style={[loadS.wrap, { opacity: pulse }]}>
      <View style={loadS.dots}>
        <View style={loadS.dot} />
        <View style={loadS.dot} />
        <View style={loadS.dot} />
      </View>
      <Text style={loadS.text}>Loading your profile...</Text>
    </Animated.View>
  );
}

const loadS = StyleSheet.create({
  wrap: { alignItems: "center", paddingTop: 80 },
  dots: { flexDirection: "row", gap: 8, marginBottom: 16 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.primary300,
  },
  text: { fontFamily: fonts.medium, fontSize: 15, color: C.n500 },
});

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
// Settings row component
// ---------------------------------------------------------------------------

function SettingsRow({
  icon,
  iconColor,
  label,
  value,
  onPress,
  isLast,
}: {
  icon: React.ReactNode;
  iconColor: string;
  label: string;
  value?: string;
  onPress?: () => void;
  isLast?: boolean;
}) {
  return (
    <>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={({ pressed }) => [
          rowS.row,
          pressed && onPress && rowS.rowPressed,
        ]}
      >
        <View style={[rowS.iconWrap, { backgroundColor: `${iconColor}12` }]}>
          {icon}
        </View>
        <View style={rowS.labelWrap}>
          <Text style={rowS.label}>{label}</Text>
          {value != null && <Text style={rowS.value}>{value}</Text>}
        </View>
        {onPress && (
          <ChevronRight size={18} color={C.n400} strokeWidth={2} />
        )}
      </Pressable>
      {!isLast && <View style={rowS.divider} />}
    </>
  );
}

const rowS = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    minHeight: 52,
    gap: 14,
  },
  rowPressed: { backgroundColor: "rgba(47, 156, 244, 0.04)" },
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

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function SettingsScreen() {
  const { logout, deleteAccount } = useAuth();
  const haptics = useHaptics();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Notifications
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem("notifications_enabled");
      if (stored === "false") {
        setNotificationsEnabled(false);
        return;
      }
      // Default: enabled if OS permission is granted
      const { status } = await Notifications.getPermissionsAsync();
      setNotificationsEnabled(status === "granted" && stored !== "false");
    })();
  }, []);

  const handleToggleNotifications = async () => {
    haptics.light();
    if (notificationsEnabled) {
      // Disable: clear push token on backend so server stops sending
      setNotificationsEnabled(false);
      AsyncStorage.setItem("notifications_enabled", "false");
      try {
        await api.post("/auth/push-token", { pushToken: "" });
      } catch {
        // best-effort
      }
    } else {
      // Enable: request permissions and register token
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
        // Permission denied — guide user to system settings
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

  // Edit name sheet state
  const editSheetRef = useRef<BottomSheetModal>(null);
  const [editFirst, setEditFirst] = useState("");
  const [editLast, setEditLast] = useState("");
  const [saving, setSaving] = useState(false);

  const fade = useRef(new Animated.Value(0)).current;

  const fetchProfile = async () => {
    try {
      const res = await api.get("/auth/me");
      setProfile(res.data);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await api.get("/auth/me");
      setProfile(res.data);
    } catch {
      // Silently fail
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [])
  );

  useEffect(() => {
    if (!loading && profile) {
      Animated.timing(fade, {
        toValue: 1,
        duration: 500,
        delay: 80,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [loading, profile]);

  // --- Edit name ---
  const openEditName = useCallback(() => {
    haptics.light();
    setEditFirst(profile?.firstName || "");
    setEditLast(profile?.lastName || "");
    editSheetRef.current?.present();
  }, [profile, haptics]);

  const hasNameChanges =
    editFirst.trim() !== (profile?.firstName || "") ||
    editLast.trim() !== (profile?.lastName || "");

  const handleSaveName = async () => {
    if (!hasNameChanges || saving) return;
    haptics.medium();
    setSaving(true);
    try {
      await api.put("/auth/me", {
        firstName: editFirst.trim() || null,
        lastName: editLast.trim() || null,
      });
      haptics.success();
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              firstName: editFirst.trim() || null,
              lastName: editLast.trim() || null,
            }
          : prev
      );
      editSheetRef.current?.dismiss();
    } catch {
      haptics.error();
      Alert.alert(
        "Something went wrong",
        "Couldn't update your name. Try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // --- Delete account ---
  const handleDeleteAccount = () => {
    haptics.heavy();
    Alert.alert(
      "Delete your account?",
      "This will permanently delete your account, all saved searches, and credit history. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete my account",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteAccount();
            } catch {
              setDeleting(false);
              Alert.alert(
                "Something went wrong",
                "Couldn't delete your account. Try again."
              );
            }
          },
        },
      ]
    );
  };

  const displayName = profile
    ? getDisplayName(profile.firstName, profile.lastName)
    : null;

  const isPrivateEmail = profile?.email?.endsWith("appleid.com") ?? false;

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.4}
      />
    ),
    []
  );

  return (
    <View style={s.root}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />
      <MeshBackground />

      <View style={[s.safe, { paddingTop: insets.top }]}>
        <ScrollView
          contentContainerStyle={[
            s.scroll,
            { paddingBottom: 100 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Header */}
          <View style={s.header}>
            <Text style={s.headerTitle}>Profile</Text>
          </View>

          {loading ? (
            <LoadingPulse />
          ) : profile ? (
            <Animated.View
              style={{
                opacity: fade,
                transform: [
                  {
                    translateY: fade.interpolate({
                      inputRange: [0, 1],
                      outputRange: [16, 0],
                    }),
                  },
                ],
              }}
            >
              {/* User identity area */}
              <View style={s.identity}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>
                    {getInitials(
                      profile.firstName,
                      profile.lastName,
                      profile.email
                    )}
                  </Text>
                </View>
                {displayName && (
                  <Text style={s.displayName}>{displayName}</Text>
                )}
                {!isPrivateEmail && (
                  <Text style={displayName ? s.emailSecondary : s.email}>
                    {profile.email}
                  </Text>
                )}
                <Text style={s.memberSince}>
                  Member since {formatMemberSince(profile.createdAt)}
                </Text>
              </View>

              {/* Quick stats */}
              <View style={s.statsRow}>
                <View style={s.stat}>
                  <Text style={s.statValue}>{profile.creditBalance}</Text>
                  <Text style={s.statLabel}>CREDITS</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.stat}>
                  <Text style={s.statValue}>{profile.activeSearches}</Text>
                  <Text style={s.statLabel}>ACTIVE</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.stat}>
                  <Text style={s.statValue}>{profile.totalSearches}</Text>
                  <Text style={s.statLabel}>TOTAL</Text>
                </View>
              </View>

              {/* Account section */}
              <Text style={s.sectionLabel}>ACCOUNT</Text>
              <SettingsRow
                icon={
                  <UserPen size={18} color={C.primary} strokeWidth={2} />
                }
                iconColor={C.primary}
                label="Name"
                value={displayName || "Add your name"}
                onPress={openEditName}
              />
              {!isPrivateEmail && (
                <SettingsRow
                  icon={<Mail size={18} color={C.primary} strokeWidth={2} />}
                  iconColor={C.primary}
                  label="Email"
                  value={profile.email}
                />
              )}
              <SettingsRow
                icon={
                  <Shield size={18} color={C.primary} strokeWidth={2} />
                }
                iconColor={C.primary}
                label="Signed in with"
                value={getProviderLabel(profile.provider)}
              />
              <SettingsRow
                icon={
                  <Calendar size={18} color={C.primary} strokeWidth={2} />
                }
                iconColor={C.primary}
                label="Member since"
                value={formatMemberSince(profile.createdAt)}
                isLast
              />

              {/* Activity section */}
              <Text style={s.sectionLabel}>ACTIVITY</Text>
              <SettingsRow
                icon={
                  <Search size={18} color={C.warm500} strokeWidth={2} />
                }
                iconColor={C.warm500}
                label="Active searches"
                value={`${profile.activeSearches} tracking`}
              />
              <SettingsRow
                icon={
                  <Coins size={18} color={C.warm500} strokeWidth={2} />
                }
                iconColor={C.warm500}
                label="Credits balance"
                value={`${profile.creditBalance} credits`}
                isLast
              />

              {/* Preferences section */}
              <Text style={s.sectionLabel}>PREFERENCES</Text>
              <View style={rowS.row}>
                <View style={[rowS.iconWrap, { backgroundColor: `${C.primary}12` }]}>
                  <Smartphone size={18} color={C.primary} strokeWidth={2} />
                </View>
                <View style={rowS.labelWrap}>
                  <Text style={rowS.label}>Haptic Feedback</Text>
                  <Text style={rowS.value}>Vibration on interactions</Text>
                </View>
                <ToggleSwitch
                  value={haptics.enabled}
                  onToggle={() => {
                    haptics.light();
                    haptics.setEnabled(!haptics.enabled);
                  }}
                />
              </View>
              <View style={rowS.divider} />
              <View style={rowS.row}>
                <View style={[rowS.iconWrap, { backgroundColor: `${C.primary}12` }]}>
                  <Bell size={18} color={C.primary} strokeWidth={2} />
                </View>
                <View style={rowS.labelWrap}>
                  <Text style={rowS.label}>Notifications</Text>
                  <Text style={rowS.value}>Price drop alerts</Text>
                </View>
                <ToggleSwitch
                  value={notificationsEnabled}
                  onToggle={handleToggleNotifications}
                />
              </View>

              {/* Support / Legal */}
              <Text style={s.sectionLabel}>SUPPORT & LEGAL</Text>
              <SettingsRow
                icon={<LifeBuoy size={18} color={C.n500} strokeWidth={2} />}
                iconColor={C.n500}
                label="Contact Support"
                onPress={() => { haptics.light(); Linking.openURL("mailto:support@example.com"); }}
              />
              <SettingsRow
                icon={<FileText size={18} color={C.n500} strokeWidth={2} />}
                iconColor={C.n500}
                label="Privacy Policy"
                onPress={() => { haptics.light(); Alert.alert("Coming Soon", "Privacy Policy will be available soon."); }}
              />
              <SettingsRow
                icon={<ScrollText size={18} color={C.n500} strokeWidth={2} />}
                iconColor={C.n500}
                label="Terms of Service"
                onPress={() => { haptics.light(); Alert.alert("Coming Soon", "Terms of Service will be available soon."); }}
                isLast
              />

              {/* Sign out */}
              <View style={s.actionWrap}>
                <Pressable
                  style={({ pressed }) => [
                    s.signOutButton,
                    pressed && s.signOutButtonPressed,
                  ]}
                  onPress={() => { haptics.medium(); logout(); }}
                >
                  <LogOut size={18} color={C.error600} strokeWidth={2} />
                  <Text style={s.signOutText}>Sign out</Text>
                </Pressable>
              </View>

              {/* Danger zone */}
              <Text style={s.dangerLabel}>DANGER ZONE</Text>
              <Pressable
                style={({ pressed }) => [
                  s.deleteRow,
                  pressed && s.deleteRowPressed,
                ]}
                onPress={handleDeleteAccount}
                disabled={deleting}
              >
                <Trash2 size={18} color={C.error500} strokeWidth={2} />
                <View style={s.deleteTextWrap}>
                  <Text style={s.deleteLabel}>
                    {deleting ? "Deleting..." : "Delete account"}
                  </Text>
                  <Text style={s.deleteDesc}>
                    Permanently remove your account and all data
                  </Text>
                </View>
              </Pressable>
            </Animated.View>
          ) : (
            /* Error / no profile state */
            <View style={s.emptyWrap}>
              <Text style={s.emptyTitle}>Couldn't load profile</Text>
              <Text style={s.emptySubtitle}>Pull down to try again</Text>
            </View>
          )}
        </ScrollView>

        <BottomNavBar />
      </View>

      {/* ---- Edit Name Bottom Sheet (gorhom) ---- */}
      <BottomSheetModal
        ref={editSheetRef}
        enableDynamicSizing
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        handleIndicatorStyle={sheetS.handleIndicator}
        backgroundStyle={sheetS.background}
        style={sheetS.sheet}
      >
        <BottomSheetView style={[sheetS.content, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          {/* Header */}
          <View style={sheetS.headerRow}>
            <Text style={sheetS.title}>Edit name</Text>
            <Pressable
              onPress={() => editSheetRef.current?.dismiss()}
              hitSlop={12}
              style={({ pressed }) => [
                sheetS.closeBtn,
                pressed && { opacity: 0.6 },
              ]}
            >
              <X size={20} color={C.n500} strokeWidth={2} />
            </Pressable>
          </View>

          {/* First name */}
          <Text style={sheetS.fieldLabel}>First name</Text>
          <BottomSheetTextInput
            style={sheetS.input}
            value={editFirst}
            onChangeText={setEditFirst}
            placeholder="First name"
            placeholderTextColor={C.n400}
            maxLength={50}
            autoCapitalize="words"
            autoCorrect={false}
          />

          {/* Last name */}
          <Text style={sheetS.fieldLabel}>Last name</Text>
          <BottomSheetTextInput
            style={sheetS.input}
            value={editLast}
            onChangeText={setEditLast}
            placeholder="Last name"
            placeholderTextColor={C.n400}
            maxLength={50}
            autoCapitalize="words"
            autoCorrect={false}
          />

          {/* Save button */}
          <Pressable
            onPress={handleSaveName}
            disabled={!hasNameChanges || saving}
            style={({ pressed }) => [
              sheetS.saveBtn,
              (!hasNameChanges || saving) && sheetS.saveBtnDisabled,
              pressed && hasNameChanges && !saving && sheetS.saveBtnPressed,
            ]}
          >
            <Text
              style={[
                sheetS.saveBtnText,
                (!hasNameChanges || saving) && sheetS.saveBtnTextDisabled,
              ]}
            >
              {saving ? "Saving..." : "Save"}
            </Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Bottom sheet styles
// ---------------------------------------------------------------------------

const sheetS = StyleSheet.create({
  sheet: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 16,
  },
  background: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicator: {
    backgroundColor: C.n300,
    width: 36,
    height: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: C.n900,
    letterSpacing: -0.4,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(148, 163, 184, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  fieldLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: C.n900,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  input: {
    backgroundColor: "rgba(241, 245, 249, 0.8)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: C.n900,
    marginBottom: 16,
  },
  saveBtn: {
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnPressed: {
    backgroundColor: C.primaryDark,
    transform: [{ scale: 0.97 }],
  },
  saveBtnDisabled: {
    backgroundColor: C.primary300,
  },
  saveBtnText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  saveBtnTextDisabled: {
    color: "rgba(255, 255, 255, 0.7)",
  },
});

// ---------------------------------------------------------------------------
// Screen styles
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#DCEEFB" },
  safe: { flex: 1 },
  scroll: { flexGrow: 1 },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 30,
    color: C.n900,
    letterSpacing: -0.6,
    lineHeight: 36,
  },

  // Identity
  identity: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 28,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  avatarText: {
    fontFamily: fonts.bold,
    fontSize: 26,
    color: "#FFFFFF",
    letterSpacing: -0.4,
  },
  displayName: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: C.n900,
    letterSpacing: -0.4,
    marginBottom: 2,
  },
  email: {
    fontFamily: fonts.semiBold,
    fontSize: 18,
    color: C.n900,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  emailSecondary: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: C.n500,
    marginBottom: 4,
  },
  memberSince: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: C.n400,
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    marginHorizontal: 20,
    marginBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: C.divider,
  },
  stat: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontFamily: fonts.extraBold,
    fontSize: 22,
    color: C.n900,
    letterSpacing: -0.6,
  },
  statLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: C.n400,
    letterSpacing: 0.8,
    marginTop: 2,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: C.divider,
  },

  // Section labels
  sectionLabel: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: C.n400,
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },

  // Sign out + actions
  actionWrap: {
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.errorBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.errorBorder,
    paddingVertical: 16,
  },
  signOutButtonPressed: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    transform: [{ scale: 0.97 }],
  },
  signOutText: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: C.error600,
  },

  // Danger zone
  dangerLabel: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: C.error500,
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 8,
  },
  deleteRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    minHeight: 52,
    gap: 14,
  },
  deleteRowPressed: {
    backgroundColor: "rgba(239, 68, 68, 0.04)",
  },
  deleteTextWrap: { flex: 1 },
  deleteLabel: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: C.error600,
    letterSpacing: -0.1,
  },
  deleteDesc: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: C.n500,
    marginTop: 1,
  },

  // Empty/error
  emptyWrap: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: C.n900,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: C.n500,
    textAlign: "center",
  },
});
