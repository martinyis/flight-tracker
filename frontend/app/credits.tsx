import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Animated,
  Easing,
  StatusBar,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fonts } from "../src/theme";
import { useCredits } from "../src/providers/CreditsProvider";
import { useHaptics } from "../src/providers/HapticsProvider";
import { useToast } from "../src/providers/ToastProvider";
import { useAppleIAP, type IAPState } from "../src/hooks/useAppleIAP";
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

interface Pack {
  id: string;
  credits: number;
  price: string;
  priceNum: number;
  label: string;
  popular?: boolean;
  appleProductId: string;
}

const PACKS: Pack[] = [
  {
    id: "starter",
    credits: 50,
    price: "$4.99",
    priceNum: 4.99,
    label: "Starter",
    appleProductId: "credits_starter_50",
  },
  {
    id: "standard",
    credits: 150,
    price: "$12.99",
    priceNum: 12.99,
    label: "Standard",
    popular: true,
    appleProductId: "credits_standard_150",
  },
  {
    id: "pro",
    credits: 400,
    price: "$29.99",
    priceNum: 29.99,
    label: "Pro",
    appleProductId: "credits_pro_400",
  },
  {
    id: "power",
    credits: 1000,
    price: "$59.99",
    priceNum: 59.99,
    label: "Power",
    appleProductId: "credits_power_1000",
  },
];

// Per-credit unit price for each pack (fallback values)
function perCreditPrice(credits: number, priceNum: number): string {
  return `$${(priceNum / credits).toFixed(2)}/credit`;
}

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
  const toast = useToast();
  const {
    products,
    isReady: iapReady,
    iapState,
    friendlyError,
    storeUnavailable,
    buyProduct,
  } = useAppleIAP(refresh);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Map IAP products for localized pricing
  const getLocalizedPrice = (appleProductId: string, fallback: string) => {
    const product = products.find((p) => p.id === appleProductId);
    return product?.displayPrice ?? fallback;
  };

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

  const handlePurchase = async (pack: Pack) => {
    haptics.medium();
    setPurchasing(pack.id);
    try {
      if (Platform.OS === "ios" && iapReady) {
        // Real Apple IAP flow
        await buyProduct(pack.appleProductId);
        haptics.success();
        toast.show(`${pack.credits} credits added to your balance!`, "success");
      } else {
        // Dev fallback (simulator without StoreKit config, Android, etc.)
        await api.post("/credits/purchase", { packId: pack.id });
        await refresh();
        haptics.success();
        toast.show(`${pack.credits} credits added to your balance!`, "success");
      }
    } catch (err: any) {
      // User cancellation -- silent
      if (err?.code === "user-cancelled") return;
      console.error("[Credits] Purchase error:", JSON.stringify(err, null, 2));
      haptics.error();
      // Use friendly error from IAP hook if available, otherwise generic
      const message =
        friendlyError ||
        err.response?.data?.error ||
        "Purchase failed. Please try again.";
      toast.show(message, "error");
    } finally {
      setPurchasing(null);
    }
  };

  // Store connection status text
  const storeStatusText = (() => {
    if (Platform.OS !== "ios") return null;
    if (storeUnavailable)
      return "App Store unavailable \u2014 prices may not be current";
    if (!iapReady) return "Connecting to App Store...";
    return null;
  })();

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />
      <MeshBackground />

      <View style={[styles.safeArea, { paddingTop: insets.top }]}>
        {/* Header: title only -- tab screen, no back button */}
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
                Buy Credits -- pack cards with Buy buttons
                ============================================================ */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Top up</Text>

              {/* Store connection status */}
              {storeStatusText && (
                <Text style={styles.storeStatusText}>{storeStatusText}</Text>
              )}

              {PACKS.map((pack, index) => {
                const isPurchasing = purchasing === pack.id;
                const isOtherPurchasing =
                  purchasing !== null && purchasing !== pack.id;
                const displayPrice = getLocalizedPrice(
                  pack.appleProductId,
                  pack.price
                );
                const unitPrice = perCreditPrice(pack.credits, pack.priceNum);
                const isLast = index === PACKS.length - 1;

                return (
                  <View key={pack.id}>
                    <View style={styles.packRow}>
                      {/* Left side: pack info */}
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
                          {pack.credits} credits · {unitPrice}
                        </Text>
                      </View>

                      {/* Right side: Buy button */}
                      <Pressable
                        style={({ pressed }) => [
                          styles.buyButton,
                          pressed && !isPurchasing && styles.buyButtonPressed,
                          (isPurchasing || isOtherPurchasing) &&
                            styles.buyButtonDisabled,
                        ]}
                        onPress={() => handlePurchase(pack)}
                        disabled={purchasing !== null}
                        hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}
                      >
                        {isPurchasing ? (
                          <View style={styles.buyButtonLoading}>
                            {iapState === "verifying" ? (
                              <Text style={styles.buyButtonVerifyingText}>
                                Verifying...
                              </Text>
                            ) : (
                              <ActivityIndicator
                                size="small"
                                color="#fff"
                              />
                            )}
                          </View>
                        ) : (
                          <Text
                            style={[
                              styles.buyButtonText,
                              isOtherPurchasing &&
                                styles.buyButtonTextDisabled,
                            ]}
                          >
                            {displayPrice}
                          </Text>
                        )}
                      </Pressable>
                    </View>
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

  // Store status
  storeStatusText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: COLOR.neutral400,
    marginBottom: 12,
    marginTop: -8,
  },

  // Pack rows -- clean full-width rows with buy buttons
  packRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    minHeight: 56,
  },
  packLeft: {
    flex: 1,
    marginRight: 16,
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
  bestValuePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "rgba(47, 156, 244, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(47, 156, 244, 0.2)",
  },
  bestValueText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: COLOR.primary500,
    letterSpacing: 0.5,
  },

  // Buy button -- prominent blue pill
  buyButton: {
    backgroundColor: COLOR.primary500,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    minWidth: 88,
    minHeight: 44, // 44pt minimum touch target per iOS HIG
    alignItems: "center",
    justifyContent: "center",
  },
  buyButtonPressed: {
    backgroundColor: COLOR.primary600,
  },
  buyButtonDisabled: {
    backgroundColor: COLOR.neutral300,
    opacity: 0.6,
  },
  buyButtonText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: "#fff",
    letterSpacing: -0.2,
  },
  buyButtonTextDisabled: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  buyButtonLoading: {
    minWidth: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  buyButtonVerifyingText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: "#fff",
    letterSpacing: -0.1,
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
