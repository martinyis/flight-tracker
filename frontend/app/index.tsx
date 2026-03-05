import { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import api from "../src/api/client";
import { useAuth } from "../src/context/AuthContext";
import AmbientHeader from "../src/components/AmbientHeader";
import FlightPanel, { type FlightPanelData } from "../src/components/FlightPanel";
import { fonts } from "../src/utils/fonts";

// ---------------------------------------------------------------------------
// Types — matches the updated backend response
// ---------------------------------------------------------------------------

interface SavedSearchSummary {
  id: number;
  tripType: "roundtrip" | "oneway";
  origin: string;
  destination: string;
  dateFrom: string;
  dateTo: string;
  minNights?: number;
  maxNights?: number;
  active: boolean;
  lastCheckedAt: string | null;
  cheapestPrice: number | null;
  resultCount: number;
  airlineLogos: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Mesh gradient background — same 4-layer wash used across the app
// ---------------------------------------------------------------------------

function MeshBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Layer 1: base diagonal wash */}
      <LinearGradient
        colors={["#E0EDFF", "#EEF4FF", "#F6F9FF", "#FAFCFF"]}
        locations={[0, 0.3, 0.65, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Layer 2: subtle top-down blue tint */}
      <LinearGradient
        colors={["rgba(147, 197, 253, 0.15)", "transparent"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.55 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Layer 3: soft warm shift from bottom-right corner */}
      <LinearGradient
        colors={["transparent", "rgba(165, 180, 252, 0.08)"]}
        start={{ x: 0, y: 0.4 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Layer 4: very faint cyan from right edge */}
      <LinearGradient
        colors={["transparent", "rgba(103, 232, 249, 0.06)", "transparent"]}
        locations={[0, 0.5, 1]}
        start={{ x: 1, y: 0.2 }}
        end={{ x: 0, y: 0.6 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// View-based empty state icon — small paper airplane silhouette
// ---------------------------------------------------------------------------

function EmptyPlaneIcon() {
  return (
    <View style={emptyIcon.wrap}>
      <View style={emptyIcon.wingTop} />
      <View style={emptyIcon.wingBottom} />
      <View style={emptyIcon.fuselage} />
    </View>
  );
}

const emptyIcon = StyleSheet.create({
  wrap: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  wingTop: {
    width: 24,
    height: 0,
    borderTopWidth: 2.5,
    borderColor: "#93C5FD",
    transform: [{ rotate: "-25deg" }],
    position: "absolute",
    top: 10,
  },
  wingBottom: {
    width: 24,
    height: 0,
    borderTopWidth: 2.5,
    borderColor: "#93C5FD",
    transform: [{ rotate: "25deg" }],
    position: "absolute",
    top: 24,
  },
  fuselage: {
    width: 28,
    height: 0,
    borderTopWidth: 2,
    borderColor: "#BFDBFE",
    position: "absolute",
    top: 17,
  },
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function HomeScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const [searches, setSearches] = useState<SavedSearchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSearches = async () => {
    try {
      const res = await api.get("/search");
      setSearches(res.data);
    } catch {
      // silently fail — user can pull to refresh
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSearches();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchSearches();
  };

  // Derive header insight data from loaded searches
  const activeCount = searches.filter((s) => s.active).length;
  const totalCount = searches.length;

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <MeshBackground />
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <MeshBackground />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3B82F6"
              colors={["#3B82F6"]}
            />
          }
        >
          {/* === Ambient header with animation + smart greeting === */}
          <AmbientHeader
            activeCount={activeCount}
            priceDropCount={0}
            totalCount={totalCount}
          />

          {/* Temporary logout button for testing */}
          <Pressable
            style={styles.logoutBtn}
            onPress={logout}
          >
            <Text style={styles.logoutText}>Log out</Text>
          </Pressable>

          {searches.length === 0 ? (
            /* --- Empty state --- */
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconCircle}>
                <EmptyPlaneIcon />
              </View>
              <Text style={styles.emptyTitle}>No searches yet</Text>
              <Text style={styles.emptySubtitle}>
                Tap the + button below to start{"\n"}tracking flight prices
              </Text>
            </View>
          ) : (
            /* --- Destination Stack: overlapping frosted panels --- */
            <View style={styles.stackContainer}>
              {searches.map((item, index) => {
                const isLast = index === searches.length - 1;

                const panelData: FlightPanelData = {
                  id: item.id,
                  tripType: item.tripType,
                  origin: item.origin,
                  destination: item.destination,
                  dateFrom: item.dateFrom,
                  dateTo: item.dateTo,
                  minNights: item.minNights,
                  maxNights: item.maxNights,
                  active: item.active,
                  lastCheckedAt: item.lastCheckedAt,
                  cheapestPrice: item.cheapestPrice,
                  resultCount: item.resultCount ?? 0,
                  airlineLogos: item.airlineLogos ?? {},
                };

                return (
                  <FlightPanel
                    key={item.id}
                    data={panelData}
                    onPress={() => router.push(`/search/${item.id}`)}
                    zIndex={searches.length - index}
                    isFirst={index === 0}
                    isLast={isLast}
                    index={index}
                  />
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* === Floating action button === */}
        <View style={styles.fabContainer} pointerEvents="box-none">
          <Pressable
            style={({ pressed }) => [
              styles.fab,
              pressed && styles.fabPressed,
            ]}
            onPress={() => router.push("/add-search")}
          >
            <Text style={styles.fabIcon}>+</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#EEF4FF",
  },
  safeArea: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EEF4FF",
  },

  // Scroll area
  scrollContent: {
    paddingBottom: 120, // clearance for FAB
    flexGrow: 1,
  },

  // Destination Stack container
  stackContainer: {
    paddingHorizontal: 20,
  },

  // Empty state
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingTop: 80,
    paddingBottom: 80,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(219, 234, 254, 0.7)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: "#0F172A",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
  },

  // Floating action button
  fabContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingBottom: 36,
    pointerEvents: "box-none",
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  fabPressed: {
    backgroundColor: "#2563EB",
    shadowOpacity: 0.2,
    transform: [{ scale: 0.94 }],
  },
  fabIcon: {
    fontFamily: fonts.light,
    fontSize: 28,
    color: "#FFFFFF",
    lineHeight: 32,
    textAlign: "center",
    marginTop: -1,
  },

  // Temporary logout button
  logoutBtn: {
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    marginBottom: 16,
  },
  logoutText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: "#EF4444",
  },
});
