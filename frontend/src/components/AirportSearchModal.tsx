import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  SectionList,
  Modal,
  Animated,
  Dimensions,
  StyleSheet,
  Platform,
  Keyboard,
  SectionListData,
} from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Airport } from "../data/airports";
import { AirportSelection } from "../types/wizard";
import {
  searchAirports,
  getTopPopularAirports,
  getCountryName,
} from "../lib/utils/airportSearch";
import { fonts } from "../theme";
import { Search, X, MapPin } from "lucide-react-native";
import { useHaptics } from "../providers/HapticsProvider";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AirportSearchModalProps {
  visible: boolean;
  /** "origin" or "destination" -- drives conversational header + placeholder */
  label: string;
  onSelect: (selection: AirportSelection) => void;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Design tokens (from DESIGN_SYSTEM.md)
// ---------------------------------------------------------------------------

const COLOR = {
  primary500: "#2F9CF4",
  primary600: "#1A7ED4",
  primary100: "#E0F2FE",
  neutral900: "#0F172A",
  neutral500: "#64748B",
  neutral400: "#94A3B8",
  neutral300: "#CBD5E1",
  neutral100: "#F1F5F9",
  white: "#FFFFFF",
} as const;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const POPULAR = getTopPopularAirports();
const SCREEN_HEIGHT = Dimensions.get("window").height;
// 95% of screen -- near-full-screen feel
const SHEET_HEIGHT = Math.round(SCREEN_HEIGHT * 0.95);

const RECENT_AIRPORTS_KEY = "recent_airports";
const MAX_RECENTS = 5;
const MIN_QUERY_LENGTH = 2;

// Row height without avatar: city (18) + gap (2) + name (16) + padding (12+12) = 60
const ITEM_HEIGHT = 60;

// ---------------------------------------------------------------------------
// Header text helpers
// ---------------------------------------------------------------------------

/** Maps the label prop to a conversational heading */
function getConversationalHeading(label: string): string {
  const lower = label.toLowerCase();
  if (lower === "from" || lower === "origin") return "Where are you flying from?";
  return "Where to?";
}

/** Maps the label prop to a tiny uppercase context label */
function getContextLabel(label: string): string {
  const lower = label.toLowerCase();
  if (lower === "from" || lower === "origin") return "ORIGIN";
  return "DESTINATION";
}

/** Maps the label prop to a contextual placeholder */
function getPlaceholder(label: string): string {
  const lower = label.toLowerCase();
  if (lower === "from" || lower === "origin") return "Where are you flying from?";
  return "Where are you headed?";
}

// ---------------------------------------------------------------------------
// AsyncStorage helpers
// ---------------------------------------------------------------------------

async function loadRecentAirports(): Promise<AirportSelection[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_AIRPORTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is AirportSelection =>
        typeof item === "object" &&
        typeof item.iata === "string" &&
        typeof item.city === "string"
    );
  } catch {
    return [];
  }
}

async function saveRecentAirport(selection: AirportSelection): Promise<void> {
  try {
    const existing = await loadRecentAirports();
    const updated = [
      selection,
      ...existing.filter((a) => a.iata !== selection.iata),
    ].slice(0, MAX_RECENTS);
    await AsyncStorage.setItem(RECENT_AIRPORTS_KEY, JSON.stringify(updated));
  } catch {
    // Silently ignore storage failures
  }
}

// ---------------------------------------------------------------------------
// Section list data helpers
// ---------------------------------------------------------------------------

interface AirportSectionItem {
  airport: Airport;
  /** For recents, the Airport object may be synthesized from AirportSelection */
  isRecent?: boolean;
}

interface AirportSection {
  title: string;
  data: AirportSectionItem[];
}

/**
 * Build an Airport object from an AirportSelection (recents only store iata + city).
 * The name and country are filled with reasonable fallbacks.
 */
function selectionToAirport(sel: AirportSelection): Airport {
  return {
    iata: sel.iata,
    city: sel.city,
    name: `${sel.city} Airport`,
    country: "",
    popular: false,
  };
}

// ---------------------------------------------------------------------------
// Query highlighting helper
// ---------------------------------------------------------------------------

interface HighlightedPart {
  text: string;
  highlight: boolean;
}

/**
 * Splits `text` into parts, highlighting the first occurrence of `query`
 * (case-insensitive). Returns an array of segments.
 */
function highlightMatch(text: string, query: string): HighlightedPart[] {
  if (!query || query.length < MIN_QUERY_LENGTH) {
    return [{ text, highlight: false }];
  }
  const lower = text.toLowerCase();
  const qLower = query.toLowerCase();
  const idx = lower.indexOf(qLower);
  if (idx === -1) return [{ text, highlight: false }];

  const parts: HighlightedPart[] = [];
  if (idx > 0) parts.push({ text: text.slice(0, idx), highlight: false });
  parts.push({ text: text.slice(idx, idx + query.length), highlight: true });
  if (idx + query.length < text.length) {
    parts.push({ text: text.slice(idx + query.length), highlight: false });
  }
  return parts;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AirportSearchModal({
  visible,
  label,
  onSelect,
  onClose,
}: AirportSearchModalProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Airport[]>([]);
  const [recents, setRecents] = useState<AirportSelection[]>([]);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [selectedIata, setSelectedIata] = useState<string | null>(null);
  const haptics = useHaptics();
  const inputRef = useRef<TextInput>(null);

  // Animation values
  const sheetY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [modalVisible, setModalVisible] = useState(false);

  // Derived header text
  const heading = getConversationalHeading(label);
  const contextLabel = getContextLabel(label);
  const placeholder = getPlaceholder(label);

  // ------ Open / close animations ------

  useEffect(() => {
    if (visible) {
      setQuery("");
      setResults([]);
      setIsInputFocused(false);
      setSelectedIata(null);
      setModalVisible(true);
      sheetY.setValue(SHEET_HEIGHT);
      backdropOpacity.setValue(0);

      loadRecentAirports().then(setRecents);

      Animated.parallel([
        Animated.spring(sheetY, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        inputRef.current?.focus();
      });
    } else if (modalVisible) {
      animateClose();
    }
  }, [visible]);

  const animateClose = useCallback(() => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(sheetY, {
        toValue: SHEET_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setModalVisible(false);
      onClose();
    });
  }, [onClose, sheetY, backdropOpacity]);

  // ------ Search handling ------

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    const trimmed = text.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults([]);
    } else {
      setResults(searchAirports(text));
    }
  }, []);

  const handleClearQuery = useCallback(() => {
    setQuery("");
    setResults([]);
    inputRef.current?.focus();
  }, []);

  // ------ Selection handling with flash ------

  const handleSelect = useCallback(
    (airport: Airport | AirportSelection) => {
      Keyboard.dismiss();
      const selection: AirportSelection =
        "name" in airport
          ? { iata: airport.iata, city: airport.city }
          : airport;

      // Flash the selected row briefly before closing
      haptics.light();
      setSelectedIata(selection.iata);
      saveRecentAirport(selection);
      onSelect(selection);

      // 150ms flash, then close animation
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(sheetY, {
            toValue: SHEET_HEIGHT,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(backdropOpacity, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setModalVisible(false);
          onClose();
        });
      }, 150);
    },
    [onSelect, onClose, sheetY, backdropOpacity]
  );

  // ------ Build section list data ------

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length >= MIN_QUERY_LENGTH;
  const isSingleChar = trimmedQuery.length === 1;
  const noResults = hasQuery && results.length === 0;

  const sections: AirportSection[] = useMemo(() => {
    if (hasQuery) {
      // Active search: single section of results
      if (results.length === 0) return [];
      return [
        {
          title: `${results.length} ${results.length === 1 ? "match" : "matches"}`,
          data: results.map((a) => ({ airport: a })),
        },
      ];
    }

    // Default state: recents (if any) + popular
    const sects: AirportSection[] = [];

    if (recents.length > 0) {
      sects.push({
        title: "RECENT",
        data: recents.map((sel) => ({
          airport: selectionToAirport(sel),
          isRecent: true,
        })),
      });
    }

    sects.push({
      title: "POPULAR",
      data: POPULAR.map((a) => ({ airport: a })),
    });

    return sects;
  }, [hasQuery, results, recents]);

  // ------ Render helpers ------

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionListData<AirportSectionItem, AirportSection> }) => (
      <View style={styles.sectionHeaderWrap}>
        <Text style={styles.sectionHeader}>{section.title}</Text>
      </View>
    ),
    []
  );

  const renderItem = useCallback(
    ({ item }: { item: AirportSectionItem }) => (
      <AirportRow
        airport={item.airport}
        query={hasQuery ? trimmedQuery : ""}
        isSelected={selectedIata === item.airport.iata}
        isRecent={item.isRecent}
        onPress={handleSelect}
      />
    ),
    [handleSelect, hasQuery, trimmedQuery, selectedIata]
  );

  const keyExtractor = useCallback(
    (item: AirportSectionItem, index: number) =>
      `${item.airport.iata}-${index}`,
    []
  );

  if (!modalVisible) return null;

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={animateClose}
    >
      <View style={styles.modalContainer}>
        {/* Dark backdrop -- tap to dismiss */}
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={animateClose} />
        </Animated.View>

        {/* Bottom sheet */}
        <Animated.View
          style={[
            styles.sheet,
            {
              height: SHEET_HEIGHT,
              transform: [{ translateY: sheetY }],
            },
          ]}
        >
          {/* Frosted glass surface */}
          <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
          <View style={styles.sheetInner}>
            {/* Drag handle */}
            <View style={styles.handle} />

            {/* Conversational header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.contextLabel}>{contextLabel}</Text>
                <Text style={styles.headerTitle}>{heading}</Text>
              </View>
              <Pressable
                onPress={animateClose}
                hitSlop={12}
                style={({ pressed }) => [
                  styles.closeBtn,
                  pressed && styles.closeBtnPressed,
                ]}
              >
                <Text style={styles.closeBtnText}>Cancel</Text>
              </Pressable>
            </View>

            {/* Search input */}
            <View
              style={[
                styles.searchRow,
                isInputFocused && styles.searchRowFocused,
              ]}
            >
              <View style={styles.searchIconWrap}>
                <Search
                  size={18}
                  color={isInputFocused ? COLOR.primary500 : COLOR.neutral400}
                  strokeWidth={2.5}
                />
              </View>

              <TextInput
                ref={inputRef}
                style={styles.searchInput}
                placeholder={placeholder}
                placeholderTextColor={COLOR.neutral400}
                value={query}
                onChangeText={handleQueryChange}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="search"
              />

              {/* Clear button -- only when there is text */}
              {query.length > 0 && (
                <Pressable
                  onPress={handleClearQuery}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.clearBtn,
                    pressed && styles.clearBtnPressed,
                  ]}
                >
                  <View style={styles.clearBtnCircle}>
                    <X size={12} color={COLOR.white} strokeWidth={3} />
                  </View>
                </Pressable>
              )}
            </View>

            {/* Single-character hint */}
            {isSingleChar && (
              <View style={styles.hintWrap}>
                <Text style={styles.hintText}>
                  Keep typing to search 6,895 airports...
                </Text>
              </View>
            )}

            {/* Empty state -- no results for query */}
            {noResults ? (
              <View style={styles.emptyState}>
                <MapPin
                  size={32}
                  color={COLOR.neutral300}
                  strokeWidth={1.5}
                />
                <Text style={styles.emptyTitle}>
                  Hmm, nothing matches that
                </Text>
                <Text style={styles.emptySubtitle}>
                  Try a different city name, airport name, or code like "JFK"
                </Text>
              </View>
            ) : (
              <SectionList
                sections={sections}
                renderItem={renderItem}
                renderSectionHeader={renderSectionHeader}
                keyExtractor={keyExtractor}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
                stickySectionHeadersEnabled={false}
                contentContainerStyle={[
                  styles.listContent,
                  { paddingBottom: Math.max(insets.bottom, 24) },
                ]}
              />
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Airport list row -- no avatar, simplified layout
// ---------------------------------------------------------------------------

interface AirportRowProps {
  airport: Airport;
  query: string;
  isSelected: boolean;
  isRecent?: boolean;
  onPress: (airport: Airport) => void;
}

function AirportRow({ airport, query, isSelected, isRecent, onPress }: AirportRowProps) {
  const countryName = getCountryName(airport.country);
  const locationLine =
    !airport.country || airport.country === "US" || airport.country === "CA"
      ? airport.city
      : `${airport.city}, ${countryName}`;

  // Highlight matching text in city name when searching
  const cityParts = query ? highlightMatch(locationLine, query) : null;

  return (
    <Pressable
      onPress={() => onPress(airport)}
      style={({ pressed }) => [
        styles.row,
        pressed && styles.rowPressed,
        isSelected && styles.rowSelected,
      ]}
    >
      {/* City + airport name */}
      <View style={styles.rowLeft}>
        {cityParts ? (
          <Text style={styles.rowCity} numberOfLines={1}>
            {cityParts.map((part, i) =>
              part.highlight ? (
                <Text key={i} style={styles.rowCityHighlight}>
                  {part.text}
                </Text>
              ) : (
                <Text key={i}>{part.text}</Text>
              )
            )}
          </Text>
        ) : (
          <Text style={styles.rowCity} numberOfLines={1}>
            {locationLine}
          </Text>
        )}
        {/* For recents we only have city, so show "Recently searched" instead of airport name */}
        <Text style={styles.rowName} numberOfLines={1}>
          {isRecent ? "Recently searched" : airport.name}
        </Text>
      </View>

      {/* IATA code */}
      <View style={styles.rowRight}>
        <Text style={styles.rowIata}>{airport.iata}</Text>
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  // Full-screen container anchored to bottom
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },

  // Semi-transparent dark overlay -- design system: rgba(15, 23, 42, 0.4)
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
  },

  // Frosted glass bottom sheet
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    // Modal shadow from design system
    shadowColor: COLOR.neutral900,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 16,
  },

  // Inner content layer on top of BlurView
  sheetInner: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
  },

  // Drag handle pill -- design system: 36x4, radius 2, CBD5E1
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLOR.neutral300,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 16,
  },

  // ------ Conversational header ------

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerLeft: {
    flex: 1,
    marginRight: 16,
  },
  contextLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: COLOR.neutral400,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: COLOR.neutral900,
    letterSpacing: -0.4,
    lineHeight: 24,
  },
  closeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 14, // Align with the heading baseline
  },
  closeBtnPressed: {
    opacity: 0.55,
  },
  closeBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: COLOR.primary500,
  },

  // ------ Search input -- design system text input spec ------

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.65)",
    marginHorizontal: 20,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
  },
  searchRowFocused: {
    borderColor: COLOR.primary500,
    borderWidth: 1.5,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
  },

  searchIconWrap: {
    width: 20,
    height: 20,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: COLOR.neutral900,
    padding: 0,
    ...Platform.select({
      android: { paddingVertical: 0 },
    }),
  },

  // Clear button
  clearBtn: {
    marginLeft: 8,
  },
  clearBtnPressed: {
    opacity: 0.6,
  },
  clearBtnCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLOR.neutral300,
    alignItems: "center",
    justifyContent: "center",
  },

  // ------ Single-character hint ------

  hintWrap: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
    alignItems: "center",
  },
  hintText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: COLOR.neutral400,
    letterSpacing: 0.1,
  },

  // ------ Section headers -- design system type.tag ------

  sectionHeaderWrap: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    backgroundColor: "transparent",
  },
  sectionHeader: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: COLOR.neutral400,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  // ------ Empty state ------

  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 44,
    paddingBottom: 80,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: COLOR.neutral900,
    textAlign: "center",
    marginTop: 4,
  },
  emptySubtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: COLOR.neutral500,
    textAlign: "center",
    lineHeight: 21,
  },

  // ------ List ------

  listContent: {
    paddingTop: 0,
  },

  // ------ Airport row -- simplified, no avatar ------

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    minHeight: ITEM_HEIGHT, // 44pt minimum touch target per iOS HIG
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(148, 163, 184, 0.2)",
  },
  rowPressed: {
    backgroundColor: COLOR.neutral100,
  },
  rowSelected: {
    backgroundColor: COLOR.primary100, // Flash on selection: #E0F2FE
  },

  rowLeft: {
    flex: 1,
    marginRight: 12,
  },
  rowCity: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: COLOR.neutral900,
    marginBottom: 2,
  },
  rowCityHighlight: {
    fontFamily: fonts.bold,
    color: COLOR.primary500,
  },
  rowName: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: COLOR.neutral400,
    lineHeight: 16,
  },
  rowRight: {
    alignItems: "flex-end",
    flexShrink: 0,
  },
  rowIata: {
    fontFamily: fonts.extraBold,
    fontSize: 18,
    color: COLOR.primary500,
    letterSpacing: 1,
  },
});
