import { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  Animated,
  KeyboardAvoidingView,
  Platform,
  UIManager,
  LayoutAnimation,
  Dimensions,
  StyleSheet,
  StatusBar,
  SafeAreaView,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import api from "../src/api/client";
import BackButton from "../src/components/BackButton";
import AirportSearchModal from "../src/components/AirportSearchModal";
import type {
  WizardStep,
  WizardFormData,
  AirportSelection,
} from "../src/types/wizard";
import AppButton from "../src/components/AppButton";
import SearchingOverlay from "../src/components/wizard/SearchingOverlay";
import { fonts } from "../src/utils/fonts";

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toYMD(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type PickerTarget = "from" | "to";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.55;

export default function AddSearchScreen() {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>("form");
  const [formData, setFormData] = useState<WizardFormData>({
    tripType: "roundtrip",
    origin: null,
    destination: null,
    dateFrom: addDays(new Date(), 7),
    dateTo: addDays(new Date(), 21),
    minNights: "1",
    maxNights: "14",
  });
  const [error, setError] = useState("");

  // Date picker state
  const [activePicker, setActivePicker] = useState<PickerTarget | null>(null);
  const sheetY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [sheetVisible, setSheetVisible] = useState(false);

  // Airport search modal state
  const [airportModalVisible, setAirportModalVisible] = useState(false);
  const [airportModalField, setAirportModalField] = useState<"origin" | "destination">("origin");

  const updateForm = useCallback(
    (updates: Partial<WizardFormData>) => {
      setFormData((prev) => {
        const next = { ...prev, ...updates };
        // Animate layout when trip type changes (shows/hides nights section)
        if (updates.tripType && updates.tripType !== prev.tripType) {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        }
        return next;
      });
    },
    []
  );

  const openAirportModal = useCallback((field: "origin" | "destination") => {
    setAirportModalField(field);
    setAirportModalVisible(true);
  }, []);

  const handleAirportSelect = useCallback((selection: AirportSelection) => {
    updateForm({ [airportModalField]: selection });
  }, [airportModalField, updateForm]);

  const closeAirportModal = useCallback(() => {
    setAirportModalVisible(false);
  }, []);

  const isValid = formData.origin !== null && formData.destination !== null;

  // Date picker
  const openPicker = (target: PickerTarget) => {
    setActivePicker(target);
    setSheetVisible(true);
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
    ]).start();
  };

  const closePicker = () => {
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
      setSheetVisible(false);
      setActivePicker(null);
    });
  };

  const onDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") {
      closePicker();
    }
    if (!selected) return;

    if (activePicker === "from") {
      const newTo = selected >= formData.dateTo ? addDays(selected, 7) : formData.dateTo;
      const maxDays = Math.floor((newTo.getTime() - selected.getTime()) / 86400000);
      const updates: Partial<WizardFormData> = { dateFrom: selected };
      if (selected >= formData.dateTo) updates.dateTo = newTo;
      if (Number(formData.maxNights) > maxDays) updates.maxNights = String(maxDays);
      if (Number(formData.minNights) > maxDays) updates.minNights = "1";
      updateForm(updates);
    } else {
      const maxDays = Math.floor((selected.getTime() - formData.dateFrom.getTime()) / 86400000);
      const updates: Partial<WizardFormData> = { dateTo: selected };
      if (Number(formData.maxNights) > maxDays) updates.maxNights = String(maxDays);
      if (Number(formData.minNights) > maxDays) updates.minNights = "1";
      updateForm(updates);
    }
  };

  const maxPossibleNights = Math.floor(
    (formData.dateTo.getTime() - formData.dateFrom.getTime()) / 86400000
  );

  const handleNightsChange = (
    field: "minNights" | "maxNights",
    delta: number
  ) => {
    const current = Number(formData[field]) || 0;
    const next = Math.max(1, Math.min(maxPossibleNights, current + delta));
    updateForm({ [field]: String(next) });
  };

  // Search
  const handleSearch = async () => {
    if (!formData.origin || !formData.destination) return;
    setStep("searching");
    setError("");
    try {
      const body: any = {
        tripType: formData.tripType,
        origin: formData.origin.iata,
        destination: formData.destination.iata,
        dateFrom: toYMD(formData.dateFrom),
        dateTo: toYMD(formData.dateTo),
      };
      if (formData.tripType === "roundtrip") {
        body.minNights = Number(formData.minNights);
        body.maxNights = Number(formData.maxNights);
      }

      const res = await api.post("/search", body, { timeout: 120_000 });
      const saved = res.data.search;
      router.replace(`/search/${saved.id}`);
    } catch (e: any) {
      setError(e.response?.data?.error ?? e.message);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setStep("form");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#F0F6FF" />

      {step === "form" && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Nav row */}
          <SafeAreaView>
            <View style={styles.navRow}>
              <BackButton />
              <Text style={styles.screenTitle}>New Search</Text>
              <View style={{ width: 38 }} />
            </View>
          </SafeAreaView>
          {/* Trip type toggle — underline tabs */}
          <View style={styles.toggleRow}>
            <Pressable
              style={styles.toggleTab}
              onPress={() => updateForm({ tripType: "roundtrip" })}
            >
              <Text
                style={[
                  styles.toggleText,
                  formData.tripType === "roundtrip" && styles.toggleTextActive,
                ]}
              >
                Round Trip
              </Text>
              {formData.tripType === "roundtrip" && (
                <View style={styles.toggleUnderline} />
              )}
            </Pressable>
            <Pressable
              style={styles.toggleTab}
              onPress={() => updateForm({ tripType: "oneway" })}
            >
              <Text
                style={[
                  styles.toggleText,
                  formData.tripType === "oneway" && styles.toggleTextActive,
                ]}
              >
                One Way
              </Text>
              {formData.tripType === "oneway" && (
                <View style={styles.toggleUnderline} />
              )}
            </Pressable>
          </View>
          <View style={styles.toggleBaseline} />

          {/* Route — tappable airport selectors */}
          <View style={styles.sectionGap} />
          <View style={styles.routeCard}>
            <Pressable
              style={({ pressed }) => [
                styles.routeAirport,
                pressed && styles.routeAirportPressed,
              ]}
              onPress={() => openAirportModal("origin")}
            >
              <Text style={styles.routeFieldLabel}>FROM</Text>
              {formData.origin ? (
                <>
                  <Text style={styles.routeCode}>{formData.origin.iata}</Text>
                  <Text style={styles.routeCity} numberOfLines={1}>
                    {formData.origin.city}
                  </Text>
                </>
              ) : (
                <Text style={styles.routeCodePlaceholder}>---</Text>
              )}
            </Pressable>

            <View style={styles.routeDivider}>
              <View style={styles.routeDash} />
              <LinearGradient
                colors={["#60A5FA", "#3B82F6"]}
                style={styles.routePlaneCircle}
              >
                <Text style={styles.routePlaneIcon}>✈</Text>
              </LinearGradient>
              <View style={styles.routeDash} />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.routeAirport,
                pressed && styles.routeAirportPressed,
              ]}
              onPress={() => openAirportModal("destination")}
            >
              <Text style={styles.routeFieldLabel}>TO</Text>
              {formData.destination ? (
                <>
                  <Text style={styles.routeCode}>
                    {formData.destination.iata}
                  </Text>
                  <Text style={styles.routeCity} numberOfLines={1}>
                    {formData.destination.city}
                  </Text>
                </>
              ) : (
                <Text style={styles.routeCodePlaceholder}>---</Text>
              )}
            </Pressable>
          </View>

          {/* Dates */}
          <View style={styles.sectionDivider} />
          <View style={styles.datesCard}>
            <Pressable
              style={[
                styles.dateRow,
                activePicker === "from" && styles.dateRowActive,
              ]}
              onPress={() => openPicker("from")}
            >
              <LinearGradient
                colors={["#DBEAFE", "#EFF6FF"]}
                style={styles.dateIconCircle}
              >
                <Text style={styles.dateIcon}>↑</Text>
              </LinearGradient>
              <View style={styles.dateLabelWrap}>
                <Text style={styles.dateLabelText}>Departure</Text>
                <Text style={styles.dateValue}>
                  {toLabel(formData.dateFrom)}
                </Text>
              </View>
              <Text style={styles.dateChevron}>›</Text>
            </Pressable>

            <View style={styles.dateDivider} />

            <Pressable
              style={[
                styles.dateRow,
                activePicker === "to" && styles.dateRowActive,
              ]}
              onPress={() => openPicker("to")}
            >
              <LinearGradient
                colors={["#EFF6FF", "#F0F6FF"]}
                style={styles.dateIconCircle}
              >
                <Text style={styles.dateIcon}>↓</Text>
              </LinearGradient>
              <View style={styles.dateLabelWrap}>
                <Text style={styles.dateLabelText}>
                  {formData.tripType === "roundtrip"
                    ? "Latest return by"
                    : "Latest departure by"}
                </Text>
                <Text style={styles.dateValue}>
                  {toLabel(formData.dateTo)}
                </Text>
              </View>
              <Text style={styles.dateChevron}>›</Text>
            </Pressable>
          </View>

          {/* Stay duration — round trip only */}
          {formData.tripType === "roundtrip" && (
            <>
              <View style={styles.sectionDivider} />
              <View style={styles.nightsCard}>
                <View style={styles.nightsRow}>
                  <Text style={styles.nightsLabel}>Min nights</Text>
                  <View style={styles.stepperRow}>
                    <Pressable
                      style={styles.stepperBtn}
                      onPress={() => handleNightsChange("minNights", -1)}
                    >
                      <Text style={styles.stepperBtnText}>−</Text>
                    </Pressable>
                    <Text style={styles.nightsValue}>{formData.minNights}</Text>
                    <Pressable
                      style={styles.stepperBtn}
                      onPress={() => handleNightsChange("minNights", 1)}
                    >
                      <Text style={styles.stepperBtnText}>+</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.nightsDivider} />

                <View style={styles.nightsRow}>
                  <Text style={styles.nightsLabel}>Max nights</Text>
                  <View style={styles.stepperRow}>
                    <Pressable
                      style={styles.stepperBtn}
                      onPress={() => handleNightsChange("maxNights", -1)}
                    >
                      <Text style={styles.stepperBtnText}>−</Text>
                    </Pressable>
                    <Text style={styles.nightsValue}>{formData.maxNights}</Text>
                    <Pressable
                      style={styles.stepperBtn}
                      onPress={() => handleNightsChange("maxNights", 1)}
                    >
                      <Text style={styles.stepperBtnText}>+</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </>
          )}

          {/* Error */}
          {error ? (
            <View style={styles.errorWrap}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Search button */}
          <View style={styles.searchBtnWrap}>
            <AppButton
              label="Search Flights"
              onPress={handleSearch}
              disabled={!isValid}
            />
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {step === "searching" && formData.origin && formData.destination && (
        <SearchingOverlay
          origin={formData.origin.iata}
          destination={formData.destination.iata}
        />
      )}

      {/* Airport search modal */}
      <AirportSearchModal
        visible={airportModalVisible}
        label={airportModalField === "origin" ? "FROM" : "TO"}
        onSelect={handleAirportSelect}
        onClose={closeAirportModal}
      />

      {/* Bottom sheet date picker */}
      <Modal
        visible={sheetVisible}
        transparent
        animationType="none"
        onRequestClose={closePicker}
      >
        <View style={styles.modalContainer}>
          <Animated.View
            style={[styles.backdrop, { opacity: backdropOpacity }]}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={closePicker} />
          </Animated.View>

          <Animated.View
            style={[
              styles.sheet,
              { transform: [{ translateY: sheetY }] },
            ]}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {activePicker === "from" ? "Departure Date" : "Return By"}
              </Text>
              <Pressable onPress={closePicker} style={styles.sheetDoneBtn}>
                <Text style={styles.sheetDoneBtnText}>Done</Text>
              </Pressable>
            </View>
            {activePicker && (
              <DateTimePicker
                value={
                  activePicker === "from" ? formData.dateFrom : formData.dateTo
                }
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                minimumDate={
                  activePicker === "to"
                    ? addDays(formData.dateFrom, 1)
                    : new Date()
                }
                onChange={onDateChange}
                themeVariant="light"
                accentColor="#3B82F6"
              />
            )}
          </Animated.View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F0F6FF",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  screenTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: "#0F172A",
  },

  // Section separators (no text labels)
  sectionGap: {
    height: 28,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 24,
    marginHorizontal: 4,
  },

  // Trip type toggle — underline tabs
  toggleRow: {
    flexDirection: "row",
  },
  toggleTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
  },
  toggleText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: "#94A3B8",
    letterSpacing: 0.3,
  },
  toggleTextActive: {
    fontFamily: fonts.bold,
    color: "#0F172A",
  },
  toggleUnderline: {
    position: "absolute",
    bottom: 0,
    left: 20,
    right: 20,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#3B82F6",
  },
  toggleBaseline: {
    height: 1,
    backgroundColor: "#E2E8F0",
  },

  // Route — compact horizontal card
  routeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
  },
  routeAirport: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
    borderRadius: 8,
  },
  routeAirportPressed: {
    backgroundColor: "rgba(59, 130, 246, 0.06)",
  },
  routeFieldLabel: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: "#94A3B8",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  routeCode: {
    fontFamily: fonts.extraBold,
    fontSize: 28,
    color: "#0F172A",
    letterSpacing: 2,
    textAlign: "center",
  },
  routeCodePlaceholder: {
    fontFamily: fonts.extraBold,
    fontSize: 28,
    color: "#CBD5E1",
    letterSpacing: 2,
    textAlign: "center",
  },
  routeCity: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
    maxWidth: 100,
  },
  routeDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 4,
  },
  routeDash: {
    width: 16,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  routePlaneCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 6,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  routePlaneIcon: {
    fontSize: 15,
    color: "#FFFFFF",
  },

  // Dates card
  datesCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  dateRowActive: {
    backgroundColor: "rgba(59, 130, 246, 0.04)",
  },
  dateIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  dateIcon: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: "#3B82F6",
  },
  dateLabelWrap: {
    flex: 1,
  },
  dateLabelText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: "#94A3B8",
    marginBottom: 3,
  },
  dateValue: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: "#0F172A",
  },
  dateChevron: {
    fontFamily: fonts.light,
    fontSize: 22,
    color: "#94A3B8",
  },
  dateDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginLeft: 20,
  },

  // Nights — single card, stacked rows (mirrors dates card)
  nightsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
  },
  nightsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  nightsLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: "#0F172A",
  },
  nightsDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginLeft: 20,
  },
  nightsValue: {
    fontFamily: fonts.extraBold,
    fontSize: 18,
    color: "#0F172A",
    minWidth: 28,
    textAlign: "center",
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  stepperBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 18,
    color: "#3B82F6",
  },

  // Error
  errorWrap: {
    marginTop: 16,
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    padding: 14,
  },
  errorText: {
    fontFamily: fonts.regular,
    color: "#DC2626",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },

  // Search button
  searchBtnWrap: {
    marginTop: 36,
  },

  // Modal bottom sheet (date picker)
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.3)",
  },
  sheet: {
    height: SHEET_HEIGHT,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingBottom: 20,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingVertical: 4,
  },
  sheetTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: "#0F172A",
  },
  sheetDoneBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  sheetDoneBtnText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: "#3B82F6",
  },
});
