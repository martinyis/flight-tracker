import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Modal,
  Animated,
  Dimensions,
  StyleSheet,
  Platform,
  Keyboard,
  ListRenderItemInfo,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Airport } from "../data/airports";
import { AirportSelection } from "../types/wizard";
import {
  searchAirports,
  getPopularAirports,
  getCountryName,
} from "../utils/airportSearch";
import { fonts } from "../utils/fonts";

interface AirportSearchModalProps {
  visible: boolean;
  /** "FROM" or "TO" — used in the header */
  label: string;
  onSelect: (selection: AirportSelection) => void;
  onClose: () => void;
}

const POPULAR = getPopularAirports();

const SCREEN_HEIGHT = Dimensions.get("window").height;
// ~88% of screen — leaves a sliver of backdrop visible at the top
const SHEET_HEIGHT = Math.round(SCREEN_HEIGHT * 0.88);

export default function AirportSearchModal({
  visible,
  label,
  onSelect,
  onClose,
}: AirportSearchModalProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Airport[]>([]);
  const inputRef = useRef<TextInput>(null);

  // Animation values
  const sheetY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [modalVisible, setModalVisible] = useState(false);

  // Open animation
  useEffect(() => {
    if (visible) {
      setQuery("");
      setResults([]);
      setModalVisible(true);
      sheetY.setValue(SHEET_HEIGHT);
      backdropOpacity.setValue(0);

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
        setTimeout(() => inputRef.current?.focus(), 100);
      });
    } else if (modalVisible) {
      // If parent sets visible=false externally, animate out
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

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    if (text.trim().length === 0) {
      setResults([]);
    } else {
      setResults(searchAirports(text));
    }
  }, []);

  const handleSelect = useCallback(
    (airport: Airport) => {
      Keyboard.dismiss();
      onSelect({ iata: airport.iata, city: airport.city });
      // Small delay so the user sees the selection before closing
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
      }, 80);
    },
    [onSelect, onClose, sheetY, backdropOpacity]
  );

  const displayList = query.trim().length > 0 ? results : POPULAR;
  const showPopularHeader = query.trim().length === 0;

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Airport>) => (
      <AirportRow airport={item} onPress={handleSelect} />
    ),
    [handleSelect]
  );

  const keyExtractor = useCallback((item: Airport) => item.iata, []);

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
        {/* Dark backdrop — tap to dismiss */}
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
          {/* Handle bar */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.labelBadge}>
                <Text style={styles.labelBadgeText}>{label}</Text>
              </View>
              <Text style={styles.headerTitle}>Select Airport</Text>
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
          <View style={styles.searchRow}>
            <View style={styles.searchIcon}>
              <Text style={styles.searchIconText}>S</Text>
            </View>
            <TextInput
              ref={inputRef}
              style={styles.searchInput}
              placeholder="Search city or airport..."
              placeholderTextColor="#94A3B8"
              value={query}
              onChangeText={handleQueryChange}
              autoCapitalize="words"
              autoCorrect={false}
              clearButtonMode="while-editing"
              returnKeyType="search"
            />
          </View>

          {/* Popular header */}
          {showPopularHeader && (
            <Text style={styles.sectionHeader}>Popular airports</Text>
          )}

          {/* Results */}
          {query.trim().length > 0 && results.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No airports found</Text>
              <Text style={styles.emptySubtitle}>
                Try searching by city name, airport name, or IATA code
              </Text>
            </View>
          ) : (
            <FlatList
              data={displayList}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.listContent,
                { paddingBottom: Math.max(insets.bottom, 20) },
              ]}
              // Performance: airports are all same height
              getItemLayout={(_, index) => ({
                length: ITEM_HEIGHT,
                offset: ITEM_HEIGHT * index,
                index,
              })}
            />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

// ---------- Airport row component ----------

const ITEM_HEIGHT = 72;

interface AirportRowProps {
  airport: Airport;
  onPress: (airport: Airport) => void;
}

function AirportRow({ airport, onPress }: AirportRowProps) {
  const countryName = getCountryName(airport.country);
  const locationLine =
    airport.country === "US" || airport.country === "CA"
      ? airport.city
      : `${airport.city}, ${countryName}`;

  return (
    <Pressable
      onPress={() => onPress(airport)}
      style={({ pressed }) => [
        styles.row,
        pressed && styles.rowPressed,
      ]}
    >
      <View style={styles.rowLeft}>
        <Text style={styles.rowCity} numberOfLines={1}>
          {locationLine}
        </Text>
        <Text style={styles.rowName} numberOfLines={1}>
          {airport.name}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.rowIata}>{airport.iata}</Text>
      </View>
    </Pressable>
  );
}

// ---------- Styles ----------

const styles = StyleSheet.create({
  // Full-screen container positioned at bottom
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },

  // Semi-transparent dark overlay
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.3)",
  },

  // White bottom sheet with rounded top corners
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    overflow: "hidden",
  },

  // Drag handle at top of sheet
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 12,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  labelBadge: {
    backgroundColor: "#3B82F6",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  labelBadgeText: {
    fontFamily: fonts.extraBold,
    color: "#FFFFFF",
    fontSize: 11,
    letterSpacing: 1,
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: "#0F172A",
  },
  closeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  closeBtnPressed: {
    opacity: 0.6,
  },
  closeBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: "#3B82F6",
  },

  // Search input — slight gray bg since sheet is already white
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    marginHorizontal: 20,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  searchIconText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: "#3B82F6",
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 16,
    color: "#0F172A",
    padding: 0,
    ...Platform.select({
      android: { paddingVertical: 0 },
    }),
  },

  // Section header
  sectionHeader: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: "#94A3B8",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 8,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingBottom: 80,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: "#64748B",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 20,
  },

  // List
  listContent: {
    paddingTop: 4,
  },

  // Row
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    height: ITEM_HEIGHT,
  },
  rowPressed: {
    backgroundColor: "rgba(59, 130, 246, 0.06)",
  },
  rowLeft: {
    flex: 1,
    marginRight: 12,
  },
  rowCity: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: "#0F172A",
    marginBottom: 3,
  },
  rowName: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: "#64748B",
  },
  rowRight: {
    alignItems: "flex-end",
  },
  rowIata: {
    fontFamily: fonts.extraBold,
    fontSize: 18,
    color: "#3B82F6",
    letterSpacing: 1,
  },
});
