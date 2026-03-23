import { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  StatusBar,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import api from "../../src/lib/api/client";
import BackButton from "../../src/components/ui/BackButton";
import { fonts } from "../../src/theme";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PriceHistoryEntry {
  date: string;
  cheapestPrice: number;
}

interface SearchData {
  id: number;
  origin: string;
  destination: string;
  cheapestPrice: number | null;
  trackingActive: boolean;
  trackingStartedAt?: string;
  priceHistory?: PriceHistoryEntry[];
}

// ---------------------------------------------------------------------------
// Mesh Background
// ---------------------------------------------------------------------------

function MeshBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={["#E0EDFF", "#EEF4FF", "#F6F9FF", "#FAFCFF"]}
        locations={[0, 0.3, 0.65, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={["rgba(147, 197, 253, 0.15)", "transparent"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.55 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={["transparent", "rgba(165, 180, 252, 0.08)"]}
        start={{ x: 0, y: 0.4 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
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
// Simple bar chart built with Views
// ---------------------------------------------------------------------------

function PriceChart({ entries }: { entries: PriceHistoryEntry[] }) {
  const screenWidth = Dimensions.get("window").width;
  const chartWidth = screenWidth - 40; // 20px padding each side
  const chartHeight = 140;

  const prices = entries.map((e) => e.cheapestPrice);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = maxPrice - minPrice || 1;

  // Points for the line chart
  const barWidth = Math.max(2, (chartWidth - 20) / Math.max(entries.length - 1, 1));

  return (
    <View style={[chartStyles.container, { height: chartHeight }]}>
      {/* Y-axis labels */}
      <View style={chartStyles.yAxis}>
        <Text style={chartStyles.yLabel}>${maxPrice}</Text>
        <Text style={chartStyles.yLabel}>${minPrice}</Text>
      </View>

      {/* Chart area */}
      <View style={chartStyles.chartArea}>
        {/* Grid lines */}
        <View style={[chartStyles.gridLine, { top: 0 }]} />
        <View style={[chartStyles.gridLine, { top: "50%" }]} />
        <View style={[chartStyles.gridLine, { bottom: 0 }]} />

        {/* Data points + connecting bars */}
        {entries.map((entry, i) => {
          const normalizedHeight = ((entry.cheapestPrice - minPrice) / range) * (chartHeight - 24);
          const x = entries.length === 1
            ? chartWidth / 2 - 20
            : (i / Math.max(entries.length - 1, 1)) * (chartWidth - 60);

          const isFirst = i === 0;
          const isLast = i === entries.length - 1;
          const prevPrice = i > 0 ? entries[i - 1].cheapestPrice : entry.cheapestPrice;
          const priceDiff = entry.cheapestPrice - prevPrice;

          return (
            <View
              key={i}
              style={[
                chartStyles.dot,
                {
                  left: x,
                  bottom: normalizedHeight + 4,
                  backgroundColor:
                    isFirst ? "#2F9CF4"
                    : priceDiff < 0 ? "#22C55E"
                    : priceDiff > 0 ? "#EF4444"
                    : "#2F9CF4",
                },
              ]}
            />
          );
        })}

        {/* Connecting lines between dots */}
        {entries.length > 1 && entries.slice(1).map((entry, i) => {
          const prevEntry = entries[i];
          const x1 = (i / Math.max(entries.length - 1, 1)) * (chartWidth - 60) + 4;
          const x2 = ((i + 1) / Math.max(entries.length - 1, 1)) * (chartWidth - 60) + 4;
          const y1 = ((prevEntry.cheapestPrice - minPrice) / range) * (chartHeight - 24) + 8;
          const y2 = ((entry.cheapestPrice - minPrice) / range) * (chartHeight - 24) + 8;

          const dx = x2 - x1;
          const dy = y2 - y1;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(-dy, dx) * (180 / Math.PI);

          return (
            <View
              key={`line-${i}`}
              style={[
                chartStyles.line,
                {
                  left: x1,
                  bottom: y1 - 1,
                  width: length,
                  transform: [{ rotate: `${angle}deg` }],
                  transformOrigin: "left center",
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function TrackingHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState<SearchData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/search/${id}`);
        setSearch(res.data);
      } catch {
        // navigation will show empty state
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const entries = useMemo(() => {
    if (!search?.priceHistory) return [];
    return [...search.priceHistory].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [search?.priceHistory]);

  const priceChange = useMemo(() => {
    if (entries.length < 2) return null;
    const first = entries[0].cheapestPrice;
    const last = entries[entries.length - 1].cheapestPrice;
    return last - first;
  }, [entries]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

  const formatDateTime = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  // ------------------------------------------------------------------
  // Loading
  // ------------------------------------------------------------------

  if (loading) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <MeshBackground />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2F9CF4" />
        </View>
      </View>
    );
  }

  if (!search) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <MeshBackground />
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Search not found</Text>
        </View>
      </View>
    );
  }

  // ------------------------------------------------------------------
  // Main render
  // ------------------------------------------------------------------

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <MeshBackground />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 20) + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Nav */}
        <View style={styles.navRow}>
          <BackButton />
        </View>

        {/* Route */}
        <Text style={styles.routeText}>
          {search.origin} → {search.destination}
        </Text>
        <Text style={styles.screenTitle}>Price history</Text>

        {/* Current price */}
        {search.cheapestPrice != null && (
          <View style={styles.priceSection}>
            <Text style={styles.currentPrice}>${search.cheapestPrice}</Text>
            <Text style={styles.currentPriceLabel}>CURRENT PRICE</Text>
          </View>
        )}

        {/* Price change summary */}
        {priceChange !== null && (
          <View
            style={[
              styles.changePill,
              priceChange < 0 && styles.changePillDown,
              priceChange > 0 && styles.changePillUp,
              priceChange === 0 && styles.changePillNeutral,
            ]}
          >
            <Text
              style={[
                styles.changePillText,
                priceChange < 0 && styles.changePillTextDown,
                priceChange > 0 && styles.changePillTextUp,
                priceChange === 0 && styles.changePillTextNeutral,
              ]}
            >
              {priceChange < 0
                ? `Down $${Math.abs(priceChange)} since tracking started`
                : priceChange > 0
                ? `Up $${priceChange} since tracking started`
                : "Prices holding steady"}
            </Text>
          </View>
        )}

        {/* Chart */}
        {entries.length >= 2 && (
          <View style={styles.chartSection}>
            <PriceChart entries={entries} />
          </View>
        )}

        {/* Timeline list */}
        {entries.length > 0 ? (
          <View style={styles.timelineSection}>
            <Text style={styles.sectionTitle}>Price checks</Text>
            {[...entries].reverse().map((entry, i, arr) => {
              const prevEntry = i < arr.length - 1 ? arr[i + 1] : null;
              const diff = prevEntry
                ? entry.cheapestPrice - prevEntry.cheapestPrice
                : 0;

              return (
                <View key={i}>
                  <View style={styles.timelineRow}>
                    <View style={styles.timelineLeft}>
                      <Text style={styles.timelineDate}>
                        {formatDateTime(entry.date)}
                      </Text>
                    </View>
                    <View style={styles.timelineRight}>
                      <Text style={styles.timelinePrice}>
                        ${entry.cheapestPrice}
                      </Text>
                      {diff !== 0 && (
                        <Text
                          style={[
                            styles.timelineDiff,
                            diff < 0 ? styles.timelineDiffDown : styles.timelineDiffUp,
                          ]}
                        >
                          {diff < 0 ? `↓$${Math.abs(diff)}` : `↑$${diff}`}
                        </Text>
                      )}
                    </View>
                  </View>
                  {i < arr.length - 1 && <View style={styles.divider} />}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptySection}>
            <Text style={styles.emptyTitle}>No price history yet</Text>
            <Text style={styles.emptySubtitle}>
              Price checks will appear here as tracking runs
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Chart styles
// ---------------------------------------------------------------------------

const chartStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  yAxis: {
    width: 50,
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  yLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: "#94A3B8",
    letterSpacing: -0.2,
  },
  chartArea: {
    flex: 1,
    position: "relative",
  },
  gridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(148, 163, 184, 0.2)",
  },
  dot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  line: {
    position: "absolute",
    height: 2,
    backgroundColor: "rgba(47, 156, 244, 0.3)",
    borderRadius: 1,
  },
});

// ---------------------------------------------------------------------------
// Screen styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#EEF4FF",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    paddingHorizontal: 20,
  },

  // Nav
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 8,
    marginBottom: 20,
  },

  // Route + title
  routeText: {
    fontFamily: fonts.extraBold,
    fontSize: 20,
    color: "#0F172A",
    letterSpacing: -0.6,
    marginBottom: 2,
  },
  screenTitle: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: "#64748B",
    letterSpacing: 0.1,
    marginBottom: 20,
  },

  // Current price
  priceSection: {
    alignItems: "center",
    marginBottom: 12,
  },
  currentPrice: {
    fontFamily: fonts.extraBold,
    fontSize: 42,
    color: "#0F172A",
    letterSpacing: -1.5,
    lineHeight: 46,
  },
  currentPriceLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    color: "#94A3B8",
    letterSpacing: 0.8,
    marginTop: 4,
  },

  // Change pill
  changePill: {
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 24,
  },
  changePillDown: {
    backgroundColor: "rgba(34, 197, 94, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.2)",
  },
  changePillUp: {
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  changePillNeutral: {
    backgroundColor: "rgba(148, 163, 184, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
  },
  changePillText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    letterSpacing: -0.1,
  },
  changePillTextDown: {
    color: "#16A34A",
  },
  changePillTextUp: {
    color: "#EF4444",
  },
  changePillTextNeutral: {
    color: "#64748B",
  },

  // Chart section
  chartSection: {
    marginBottom: 28,
    paddingVertical: 12,
  },

  // Timeline
  timelineSection: {
    gap: 0,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: "#0F172A",
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  timelineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    minHeight: 44,
  },
  timelineLeft: {
    flex: 1,
  },
  timelineDate: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: "#64748B",
    letterSpacing: -0.1,
  },
  timelineRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timelinePrice: {
    fontFamily: fonts.extraBold,
    fontSize: 16,
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  timelineDiff: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    letterSpacing: -0.1,
  },
  timelineDiffDown: {
    color: "#22C55E",
  },
  timelineDiffUp: {
    color: "#EF4444",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(148, 163, 184, 0.2)",
  },

  // Empty states
  emptyText: {
    fontFamily: fonts.regular,
    color: "#94A3B8",
    fontSize: 16,
  },
  emptySection: {
    alignItems: "center",
    paddingTop: 48,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: "#0F172A",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
});
