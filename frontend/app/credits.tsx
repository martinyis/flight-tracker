import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Alert,
  Animated,
  Easing,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fonts } from "../src/theme";
import { useCredits } from "../src/providers/CreditsProvider";
import { useHaptics } from "../src/providers/HapticsProvider";
import MeshBackground from "../src/components/ui/MeshBackground";
import BottomNavBar from "../src/components/ui/BottomNavBar";
import api from "../src/lib/api/client";

// ---------------------------------------------------------------------------
// Design system colors
// ---------------------------------------------------------------------------

const COLOR = {
  primary500: "#2F9CF4",
  primary600: "#1A7ED4",
  neutral900: "#0F172A",
  neutral500: "#64748B",
  neutral400: "#94A3B8",
  neutral300: "#CBD5E1",
  neutral100: "#F1F5F9",
  success600: "#16A34A",
  error600: "#DC2626",
  warm500: "#F59E0B",
  divider: "rgba(148, 163, 184, 0.2)",
};

// ---------------------------------------------------------------------------
// Credit packs data
// ---------------------------------------------------------------------------

const PACKS: readonly {
  id: string;
  credits: number;
  price: string;
  label: string;
  popular?: boolean;
}[] = [
  { id: "starter", credits: 50, price: "$4.99", label: "Starter" },
  {
    id: "standard",
    credits: 150,
    price: "$12.99",
    label: "Standard",
    popular: true,
  },
  { id: "pro", credits: 400, price: "$29.99", label: "Pro" },
  { id: "power", credits: 1000, price: "$59.99", label: "Power" },
];

// ---------------------------------------------------------------------------
// Transaction type labels (friendly per design system voice)
// ---------------------------------------------------------------------------

function typeLabel(type: string): string {
  switch (type) {
    case "signup_bonus":
      return "Welcome bonus";
    case "purchase":
      return "Credits purchased";
    case "search":
      return "Search";
    case "tracking":
      return "Tracking";
    case "refund":
      return "Refund";
    default:
      return type;
  }
}

// ---------------------------------------------------------------------------
// Animated number ticker for the balance (design system Section 9)
// Counts from 0 to target value over ~600ms
// ---------------------------------------------------------------------------

function AnimatedBalance({ value }: { value: number }) {
  const animValue = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    animValue.setValue(0);
    const listener = animValue.addListener(({ value: v }) => {
      setDisplay(Math.round(v));
    });

    Animated.timing(animValue, {
      toValue: value,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // needed for addListener value tracking
    }).start();

    return () => animValue.removeListener(listener);
  }, [value]);

  return <Text style={styles.balanceNumber}>{display}</Text>;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function CreditsScreen() {
  const insets = useSafeAreaInsets();
  const { balance, transactions, refresh } = useCredits();
  const haptics = useHaptics();
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  // Entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      delay: 100,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePurchase = async (packId: string) => {
    haptics.medium();
    setPurchasing(packId);
    try {
      await api.post("/credits/purchase", { packId });
      await refresh();
      haptics.success();
      Alert.alert("Credits added", "Your credits have been added.");
    } catch (err: any) {
      haptics.error();
      Alert.alert("Error", err.response?.data?.error || "Purchase failed");
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />
      <MeshBackground />

      <View style={[styles.safeArea, { paddingTop: insets.top }]}>
        {/* Header: title only — tab screen, no back button */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Credits</Text>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 100 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* ============================================================
                Balance display -- large typographic, no card
                Design system Section 8 (Credits Screen)
                ============================================================ */}
            <View style={styles.balanceSection}>
              {balance != null ? (
                <AnimatedBalance value={balance} />
              ) : (
                <Text style={styles.balanceNumber}>--</Text>
              )}
              <Text style={styles.balanceLabel}>CREDITS AVAILABLE</Text>
            </View>

            {/* ============================================================
                Buy Credits -- vertical list rows, not a 2x2 grid
                ============================================================ */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Top up</Text>

              {PACKS.map((pack, index) => {
                const isLast = index === PACKS.length - 1;
                const isPurchasing = purchasing === pack.id;

                return (
                  <View key={pack.id}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.packRow,
                        pressed && styles.packRowPressed,
                        isPurchasing && styles.packRowDisabled,
                      ]}
                      onPress={() => handlePurchase(pack.id)}
                      disabled={purchasing !== null}
                    >
                      <View style={styles.packLeft}>
                        <View style={styles.packNameRow}>
                          <Text style={styles.packName}>{pack.label}</Text>
                          {pack.popular && (
                            <View style={styles.bestValuePill}>
                              <Text style={styles.bestValueText}>
                                BEST VALUE
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.packCredits}>
                          {pack.credits} credits
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.packPrice,
                          isPurchasing && styles.packPriceDisabled,
                        ]}
                      >
                        {isPurchasing ? "..." : pack.price}
                      </Text>
                    </Pressable>
                    {!isLast && <View style={styles.divider} />}
                  </View>
                );
              })}
            </View>

            {/* ============================================================
                Activity log -- list rows with hairline dividers
                ============================================================ */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent activity</Text>

              {transactions.length === 0 ? (
                <Text style={styles.emptyText}>
                  No activity yet. Your transaction history will show here.
                </Text>
              ) : (
                transactions.map((tx, index) => {
                  const isLast = index === transactions.length - 1;
                  return (
                    <View key={tx.id}>
                      <View style={styles.txRow}>
                        <View style={styles.txLeft}>
                          <Text style={styles.txType}>
                            {typeLabel(tx.type)}
                          </Text>
                          {tx.note && (
                            <Text
                              style={styles.txNote}
                              numberOfLines={1}
                            >
                              {tx.note}
                            </Text>
                          )}
                        </View>
                        <Text
                          style={[
                            styles.txAmount,
                            {
                              color:
                                tx.amount > 0
                                  ? COLOR.success600
                                  : COLOR.error600,
                            },
                          ]}
                        >
                          {tx.amount > 0 ? "+" : ""}
                          {tx.amount}
                        </Text>
                      </View>
                      {!isLast && <View style={styles.divider} />}
                    </View>
                  );
                })
              )}
            </View>
          </Animated.View>
        </ScrollView>

        {/* Bottom nav bar */}
        <BottomNavBar />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#DCEEFB",
  },
  safeArea: {
    flex: 1,
  },

  // Header
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 30,
    color: COLOR.neutral900,
    letterSpacing: -0.6,
  },

  // Scroll content
  scrollContent: {
    paddingHorizontal: 20,
  },

  // Balance -- typographic, no card, directly on background
  balanceSection: {
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 32,
  },
  balanceNumber: {
    fontFamily: fonts.extraBold,
    fontSize: 56,
    color: COLOR.neutral900,
    letterSpacing: -2,
    lineHeight: 60,
  },
  balanceLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: COLOR.neutral400,
    letterSpacing: 0.8,
    marginTop: 4,
  },

  // Sections
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: COLOR.neutral900,
    letterSpacing: -0.2,
    marginBottom: 16,
  },

  // Pack rows -- full-width tappable rows
  packRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    minHeight: 56, // 44pt minimum touch target with padding
  },
  packRowPressed: {
    backgroundColor: "rgba(47, 156, 244, 0.04)",
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  packRowDisabled: {
    opacity: 0.5,
  },
  packLeft: {
    flex: 1,
  },
  packNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  packName: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: COLOR.neutral900,
  },
  packCredits: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: COLOR.neutral500,
    marginTop: 2,
  },
  packPrice: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: COLOR.primary500,
  },
  packPriceDisabled: {
    color: COLOR.neutral400,
  },
  bestValuePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "rgba(47, 156, 244, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(47, 156, 244, 0.15)",
  },
  bestValueText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: COLOR.primary500,
    letterSpacing: 0.5,
  },

  // Hairline divider
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLOR.divider,
  },

  // Empty text
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: COLOR.neutral400,
    lineHeight: 20,
  },

  // Transaction rows
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    minHeight: 48,
  },
  txLeft: {
    flex: 1,
  },
  txType: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: COLOR.neutral900,
    letterSpacing: -0.1,
  },
  txNote: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: COLOR.neutral500,
    marginTop: 2,
  },
  txAmount: {
    fontFamily: fonts.bold,
    fontSize: 16,
    letterSpacing: -0.3,
  },
});
