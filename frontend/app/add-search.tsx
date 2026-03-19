import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Animated,
  Modal,
  KeyboardAvoidingView,
  Platform,
  UIManager,
  LayoutAnimation,
  Dimensions,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  TextInput,
} from "react-native";
import CalendarPicker from "../src/components/wizard/CalendarPicker";
import Slider from "@react-native-community/slider";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import BackButton from "../src/components/ui/BackButton";
import AirportSearchModal from "../src/components/AirportSearchModal";
import type {
  WizardStep,
  WizardFormData,
  AirportSelection,
} from "../src/types/wizard";
import AppButton from "../src/components/ui/AppButton";
import SearchingOverlay from "../src/components/wizard/SearchingOverlay";
import InsufficientCreditsModal from "../src/components/ui/InsufficientCreditsModal";
import { useCredits } from "../src/providers/CreditsProvider";
import { usePendingSearch } from "../src/providers/PendingSearchProvider";
import { useHaptics } from "../src/providers/HapticsProvider";
import { useAuth } from "../src/providers/AuthProvider";
import { Check, PlaneTakeoff, PlaneLanding, Calendar, Moon, CornerDownLeft, ChevronRight, ChevronUp, ChevronDown, ArrowRight } from "lucide-react-native";

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ---------------------------------------------------------------------------
// Pure helpers — date math, labels
// ---------------------------------------------------------------------------

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

function toShortLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Business logic — combos + credit costs (unchanged)
// ---------------------------------------------------------------------------

function countCombos(
  dateFrom: string,
  dateTo: string,
  minN: number,
  maxN: number
): number {
  const from = new Date(dateFrom + "T00:00:00Z");
  const to = new Date(dateTo + "T00:00:00Z");
  const lastOut = new Date(to.getTime() - minN * 86_400_000);
  const dates: string[] = [];
  let cur = new Date(from);
  while (cur <= lastOut) {
    dates.push(cur.toISOString().slice(0, 10));
    cur = new Date(cur.getTime() + 86_400_000);
  }
  let count = 0;
  for (const out of dates) {
    const outMs = new Date(out + "T00:00:00Z").getTime();
    const earliest = new Date(outMs + minN * 86_400_000);
    const latest = new Date(
      Math.min(outMs + maxN * 86_400_000, to.getTime())
    );
    const diff =
      Math.round((latest.getTime() - earliest.getTime()) / 86_400_000) + 1;
    if (diff > 0) count += diff;
  }
  return count;
}

function computeSearchCredits(combos: number): number {
  if (combos <= 10) return 5;
  if (combos <= 20) return 10;
  if (combos <= 50) return 20;
  if (combos <= 100) return 35;
  if (combos <= 150) return 55;
  return 80;
}

const COMBO_HARD_CAP = 200;

const DURATION_OPTIONS = [
  { label: "Any", value: 0 },
  { label: "4h", value: 240 },
  { label: "6h", value: 360 },
  { label: "8h", value: 480 },
  { label: "10h", value: 600 },
  { label: "12h", value: 720 },
  { label: "16h", value: 960 },
  { label: "24h", value: 1440 },
];

type PickerTarget = "from" | "to";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.55;

// ---------------------------------------------------------------------------
// Step section IDs
// ---------------------------------------------------------------------------

type SectionId = "route" | "dates" | "nights";

// ---------------------------------------------------------------------------
// AnimatedSection — collapses/expands with height + fade animation
// ---------------------------------------------------------------------------

interface AnimatedSectionProps {
  expanded: boolean;
  children: React.ReactNode;
}

function AnimatedSection({ expanded, children }: AnimatedSectionProps) {
  const height = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  const opacity = useRef(new Animated.Value(expanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(height, {
        toValue: expanded ? 1 : 0,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(opacity, {
        toValue: expanded ? 1 : 0,
        duration: expanded ? 280 : 180,
        useNativeDriver: false,
      }),
    ]).start();
  }, [expanded]);

  // We use maxHeight trick since Animated can't animate height to "auto"
  const maxH = height.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 600],
    extrapolate: "clamp",
  });

  return (
    <Animated.View
      style={{ maxHeight: maxH, opacity, overflow: "hidden" }}
    >
      {children}
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Step indicator circle
// ---------------------------------------------------------------------------

const SECTION_ICONS: Record<SectionId, React.ComponentType<{ size: number; color: string; strokeWidth: number }>> = {
  route: PlaneTakeoff,
  dates: Calendar,
  nights: Moon,
};

interface StepIndicatorProps {
  section: SectionId;
  active: boolean;
  done: boolean;
}

function StepIndicator({ section, active, done }: StepIndicatorProps) {
  const Icon = SECTION_ICONS[section];

  if (done) {
    return (
      <View style={styles.stepIndicator}>
        <Check size={18} color="#3B82F6" strokeWidth={2.5} />
      </View>
    );
  }

  if (active) {
    return (
      <View style={[styles.stepIndicator, styles.stepIndicatorActive]}>
        <Icon size={18} color="#2563EB" strokeWidth={2} />
      </View>
    );
  }

  return (
    <View style={styles.stepIndicator}>
      <Icon size={18} color="#94A3B8" strokeWidth={1.5} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Toggle switch component
// ---------------------------------------------------------------------------

interface ToggleSwitchProps {
  value: boolean;
  onToggle: () => void;
}

function ToggleSwitch({ value, onToggle }: ToggleSwitchProps) {
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
      style={[styles.switchTrack, value && styles.switchTrackOn]}
      hitSlop={8}
    >
      <Animated.View
        style={[styles.switchKnob, { transform: [{ translateX }] }]}
      />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function AddSearchScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const { balance } = useCredits();
  const { hasUsedFreeSearch, markFreeSearchUsed } = useAuth();
  const { startSearch, pending, isSearching, dismiss } = usePendingSearch();
  const [step, setStep] = useState<WizardStep>("form");
  const [formData, setFormData] = useState<WizardFormData>({
    tripType: "roundtrip",
    origin: null,
    destination: null,
    dateFrom: addDays(new Date(), 7),
    dateTo: addDays(new Date(), 21),
    minNights: "3",
    maxNights: "7",
    apiFilters: {},
  });
  const [error, setError] = useState("");
  const [creditsModalVisible, setCreditsModalVisible] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [airlineInput, setAirlineInput] = useState("");

  // Track which section is currently expanded (active)
  const [activeSection, setActiveSection] = useState<SectionId>("route");

  // Which sections have been "completed" (user has moved past them)
  const [completedSections, setCompletedSections] = useState<
    Set<SectionId>
  >(new Set());

  // Live combo counter + credit costs
  const comboInfo = useMemo(() => {
    let combos: number;
    if (formData.tripType === "roundtrip") {
      const minN = parseInt(formData.minNights, 10) || 1;
      const maxN = parseInt(formData.maxNights, 10) || 14;
      combos = countCombos(
        toYMD(formData.dateFrom),
        toYMD(formData.dateTo),
        minN,
        maxN
      );
    } else {
      const diffMs = formData.dateTo.getTime() - formData.dateFrom.getTime();
      combos = Math.floor(diffMs / 86_400_000) + 1;
    }
    const searchCost = computeSearchCredits(combos);
    const isFreeSearch = !hasUsedFreeSearch;
    return {
      count: combos,
      searchCost,
      overLimit: combos > COMBO_HARD_CAP,
      canAfford: isFreeSearch || (balance != null && balance >= searchCost),
      isFreeSearch,
    };
  }, [
    formData.tripType,
    formData.dateFrom,
    formData.dateTo,
    formData.minNights,
    formData.maxNights,
    balance,
    hasUsedFreeSearch,
  ]);

  // Date picker state
  const [activePicker, setActivePicker] = useState<PickerTarget | null>(null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  // Airport search modal state
  const [airportModalVisible, setAirportModalVisible] = useState(false);
  const [airportModalField, setAirportModalField] = useState<
    "origin" | "destination"
  >("origin");

  const updateForm = useCallback((updates: Partial<WizardFormData>) => {
    setFormData((prev) => {
      const next = { ...prev, ...updates };
      if (updates.tripType && updates.tripType !== prev.tripType) {
        haptics.light();
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      return next;
    });
  }, [haptics]);

  const openAirportModal = useCallback(
    (field: "origin" | "destination") => {
      setAirportModalField(field);
      setAirportModalVisible(true);
    },
    []
  );

  const handleAirportSelect = useCallback(
    (selection: AirportSelection) => {
      updateForm({ [airportModalField]: selection });
    },
    [airportModalField, updateForm]
  );

  const closeAirportModal = useCallback(() => {
    setAirportModalVisible(false);
  }, []);

  const isValid = formData.origin !== null && formData.destination !== null;

  // ---------------------------------------------------------------------------
  // Section navigation helpers
  // ---------------------------------------------------------------------------

  const sectionOrder: SectionId[] = useMemo(() => {
    if (formData.tripType === "roundtrip") {
      return ["route", "dates", "nights"];
    }
    return ["route", "dates"];
  }, [formData.tripType]);

  const goToSection = useCallback(
    (id: SectionId) => {
      haptics.selection();
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setActiveSection(id);
    },
    [haptics]
  );

  const completeSection = useCallback(
    (current: SectionId) => {
      haptics.medium();
      const idx = sectionOrder.indexOf(current);
      const next = sectionOrder[idx + 1];
      setCompletedSections((prev) => {
        const s = new Set(prev);
        s.add(current);
        return s;
      });
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      if (next) {
        setActiveSection(next);
      }
    },
    [sectionOrder, haptics]
  );

  const isSectionDone = (id: SectionId) => completedSections.has(id);
  const isSectionActive = (id: SectionId) => activeSection === id;

  // ---------------------------------------------------------------------------
  // Route section — airport selection
  // ---------------------------------------------------------------------------

  const routeSummary =
    formData.origin && formData.destination
      ? `${formData.origin.iata} → ${formData.destination.iata}`
      : formData.origin
      ? `${formData.origin.iata} → ?`
      : "Select airports";

  const handleRouteNext = useCallback(() => {
    if (formData.origin && formData.destination) {
      completeSection("route");
    }
  }, [formData.origin, formData.destination, completeSection]);

  // ---------------------------------------------------------------------------
  // Dates section
  // ---------------------------------------------------------------------------

  const datesSummary =
    formData.tripType === "roundtrip"
      ? `${toShortLabel(formData.dateFrom)} – ${toShortLabel(formData.dateTo)}`
      : `From ${toShortLabel(formData.dateFrom)} to ${toShortLabel(
          formData.dateTo
        )}`;

  const handleDatesNext = useCallback(() => {
    completeSection("dates");
  }, [completeSection]);

  // ---------------------------------------------------------------------------
  // Nights section
  // ---------------------------------------------------------------------------

  const nightsSummary =
    formData.minNights === formData.maxNights
      ? `${formData.minNights} nights`
      : `${formData.minNights} – ${formData.maxNights} nights`;

  // ---------------------------------------------------------------------------
  // Date picker
  // ---------------------------------------------------------------------------

  const openPicker = (target: PickerTarget) => {
    haptics.light();
    setActivePicker(target);
    setDatePickerVisible(true);
  };

  const closePicker = () => {
    setDatePickerVisible(false);
    setActivePicker(null);
  };

  const onDateChange = (selected: Date) => {
    if (activePicker === "from") {
      const newTo =
        selected >= formData.dateTo ? addDays(selected, 7) : formData.dateTo;
      const maxDays = Math.floor(
        (newTo.getTime() - selected.getTime()) / 86400000
      );
      const updates: Partial<WizardFormData> = { dateFrom: selected };
      if (selected >= formData.dateTo) updates.dateTo = newTo;
      if (Number(formData.maxNights) > maxDays)
        updates.maxNights = String(Math.max(1, maxDays));
      if (Number(formData.minNights) > maxDays)
        updates.minNights = String(Math.max(1, maxDays));
      updateForm(updates);
    } else {
      const maxDays = Math.floor(
        (selected.getTime() - formData.dateFrom.getTime()) / 86400000
      );
      const updates: Partial<WizardFormData> = { dateTo: selected };
      if (Number(formData.maxNights) > maxDays)
        updates.maxNights = String(Math.max(1, maxDays));
      if (Number(formData.minNights) > maxDays)
        updates.minNights = String(Math.max(1, maxDays));
      updateForm(updates);
    }
  };

  const maxPossibleNights = Math.floor(
    (formData.dateTo.getTime() - formData.dateFrom.getTime()) / 86400000
  );

  const handleMinNightsChange = (value: number) => {
    const v = Math.round(value);
    if (String(v) !== formData.minNights) {
      haptics.selection();
      const maxN = Math.max(v, Number(formData.maxNights));
      updateForm({ minNights: String(v), maxNights: String(maxN) });
    }
  };

  const handleMaxNightsChange = (value: number) => {
    const v = Math.round(value);
    if (String(v) !== formData.maxNights) {
      haptics.selection();
      const minN = Math.min(v, Number(formData.minNights));
      updateForm({ minNights: String(minN), maxNights: String(v) });
    }
  };

  // ---------------------------------------------------------------------------
  // API filters builder (unchanged logic)
  // ---------------------------------------------------------------------------

  const buildApiFilters = () => {
    const f = formData.apiFilters;
    const filters: any = {};
    if (f.stops) filters.stops = f.stops;
    if (f.airlines?.trim()) {
      const codes = f.airlines
        .split(",")
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean);
      if (codes.length > 0) {
        if (f.airlineMode === "exclude") {
          filters.excludeAirlines = codes;
        } else {
          filters.includeAirlines = codes;
        }
      }
    }
    if (f.maxDuration && f.maxDuration > 0) filters.maxDuration = f.maxDuration;
    if (f.bags) filters.bags = 1;
    return Object.keys(filters).length > 0 ? filters : undefined;
  };

  // Count active filters for the "Preferences" summary badge
  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (formData.apiFilters.stops) n++;
    if (formData.apiFilters.bags) n++;
    if (formData.apiFilters.airlines?.trim()) n++;
    if (formData.apiFilters.maxDuration && formData.apiFilters.maxDuration > 0)
      n++;
    return n;
  }, [formData.apiFilters]);

  // ---------------------------------------------------------------------------
  // Search handler — delegates to PendingSearchProvider
  // ---------------------------------------------------------------------------

  const handleSearch = async () => {
    if (!formData.origin || !formData.destination) return;
    setStep("searching");
    setError("");

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
    const apiFilters = buildApiFilters();
    if (apiFilters) body.apiFilters = apiFilters;

    const result = await startSearch(
      body,
      formData.origin.iata,
      formData.destination.iata,
    );

    // Duplicate search — navigate to the existing result
    if (result.existingSearchId) {
      router.replace(`/search/${result.existingSearchId}`);
      return;
    }

    // Fast error (402, 429) — show inline on form or credits modal
    if (result.fastError) {
      haptics.error();
      if (result.insufficientCredits) {
        setCreditsModalVisible(true);
      } else {
        setError(result.fastError);
      }
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setStep("form");
      return;
    }

    // Slow error — user may still be on overlay or may have navigated away.
    // If still here, revert to form so they can retry.
    if (!result.ok) {
      setStep("form");
    }
    // If ok — the useEffect below handles navigation
  };

  // Auto-navigate to results if search completes while still on overlay
  useEffect(() => {
    if (
      step === "searching" &&
      pending?.status === "completed" &&
      pending.searchId
    ) {
      if (comboInfo.isFreeSearch) markFreeSearchUsed();
      dismiss();
      router.replace(`/search/${pending.searchId}`);
    }
  }, [pending, step]);

  const handleContinueBrowsing = () => {
    haptics.light();
    router.replace("/");
  };

  // ---------------------------------------------------------------------------
  // Preferences summary label
  // ---------------------------------------------------------------------------

  const preferencesSummary = useMemo(() => {
    const parts: string[] = [];
    if (formData.apiFilters.stops === 1) parts.push("Nonstop");
    else if (formData.apiFilters.stops === 2) parts.push("1 stop max");
    if (formData.apiFilters.bags) parts.push("Carry-on");
    if (formData.apiFilters.maxDuration && formData.apiFilters.maxDuration > 0) {
      const h = Math.round(formData.apiFilters.maxDuration / 60);
      parts.push(`Max ${h}h`);
    }
    if (formData.apiFilters.airlines?.trim()) {
      parts.push("Airlines filtered");
    }
    return parts.length > 0 ? parts.join(" · ") : "No filters applied";
  }, [formData.apiFilters]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

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

          {/* Trip type toggle — pill selector */}
          <View style={styles.tripToggleRow}>
            <Pressable
              style={[
                styles.tripToggleOption,
                formData.tripType === "roundtrip" &&
                  styles.tripToggleOptionActive,
              ]}
              onPress={() => updateForm({ tripType: "roundtrip" })}
            >
              <Text
                style={[
                  styles.tripToggleText,
                  formData.tripType === "roundtrip" &&
                    styles.tripToggleTextActive,
                ]}
              >
                Round Trip
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.tripToggleOption,
                formData.tripType === "oneway" && styles.tripToggleOptionActive,
              ]}
              onPress={() => updateForm({ tripType: "oneway" })}
            >
              <Text
                style={[
                  styles.tripToggleText,
                  formData.tripType === "oneway" && styles.tripToggleTextActive,
                ]}
              >
                One Way
              </Text>
            </Pressable>
          </View>

          {/* ================================================================
              WIZARD SECTIONS
          ================================================================ */}
          <View style={styles.wizardContainer}>

            {/* Vertical connector line — behind all steps */}
            <View style={styles.connectorLine} />

            {/* ──────────────────────────────────────────────
                STEP 1: Route
            ────────────────────────────────────────────── */}
            <WizardSection
              section="route"
              active={isSectionActive("route")}
              done={isSectionDone("route")}
              title="Where to?"
              summary={routeSummary}
              onHeaderPress={() => goToSection("route")}
              isLastSection={sectionOrder.indexOf("route") === sectionOrder.length - 1}
            >
              {/* FROM airport */}
              <Pressable
                style={({ pressed }) => [
                  styles.airportRow,
                  pressed && styles.airportRowPressed,
                ]}
                onPress={() => openAirportModal("origin")}
              >
                <View style={styles.airportIconWrap}>
                  <LinearGradient
                    colors={["#DBEAFE", "#EFF6FF"]}
                    style={styles.airportIcon}
                  >
                    <PlaneTakeoff size={16} color="#3B82F6" strokeWidth={2} />
                  </LinearGradient>
                </View>
                <View style={styles.airportTextWrap}>
                  <Text style={styles.airportFieldLabel}>FROM</Text>
                  {formData.origin ? (
                    <View style={styles.airportSelected}>
                      <Text style={styles.airportCode}>
                        {formData.origin.iata}
                      </Text>
                      <Text style={styles.airportCity} numberOfLines={1}>
                        {formData.origin.city}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.airportPlaceholder}>
                      Select departure airport
                    </Text>
                  )}
                </View>
                <ChevronRight size={18} color="#94A3B8" strokeWidth={2} />
              </Pressable>

              <View style={styles.airportDivider} />

              {/* TO airport */}
              <Pressable
                style={({ pressed }) => [
                  styles.airportRow,
                  pressed && styles.airportRowPressed,
                ]}
                onPress={() => openAirportModal("destination")}
              >
                <View style={styles.airportIconWrap}>
                  <LinearGradient
                    colors={["#EFF6FF", "#F0F6FF"]}
                    style={styles.airportIcon}
                  >
                    <PlaneLanding size={16} color="#3B82F6" strokeWidth={2} />
                  </LinearGradient>
                </View>
                <View style={styles.airportTextWrap}>
                  <Text style={styles.airportFieldLabel}>TO</Text>
                  {formData.destination ? (
                    <View style={styles.airportSelected}>
                      <Text style={styles.airportCode}>
                        {formData.destination.iata}
                      </Text>
                      <Text style={styles.airportCity} numberOfLines={1}>
                        {formData.destination.city}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.airportPlaceholder}>
                      Select destination airport
                    </Text>
                  )}
                </View>
                <ChevronRight size={18} color="#94A3B8" strokeWidth={2} />
              </Pressable>

              {/* Next button — enabled only when both airports selected */}
              <View style={styles.sectionNextWrap}>
                <Pressable
                  style={({ pressed }) => [
                    styles.sectionNextBtn,
                    !isValid && styles.sectionNextBtnDisabled,
                    pressed && isValid && styles.sectionNextBtnPressed,
                  ]}
                  onPress={handleRouteNext}
                  disabled={!isValid}
                >
                  <Text
                    style={[
                      styles.sectionNextBtnText,
                      !isValid && styles.sectionNextBtnTextDisabled,
                    ]}
                  >
                    Continue
                  </Text>
                  <ArrowRight size={16} color={isValid ? "#FFFFFF" : "rgba(255,255,255,0.5)"} strokeWidth={2.5} />
                </Pressable>
              </View>
            </WizardSection>

            {/* ──────────────────────────────────────────────
                STEP 2: Dates
            ────────────────────────────────────────────── */}
            <WizardSection
              section="dates"
              active={isSectionActive("dates")}
              done={isSectionDone("dates")}
              title="When can you fly?"
              summary={datesSummary}
              onHeaderPress={() => goToSection("dates")}
              isLastSection={sectionOrder.indexOf("dates") === sectionOrder.length - 1}
            >
              {/* Departure date row */}
              <Pressable
                style={({ pressed }) => [
                  styles.datePickerRow,
                  activePicker === "from" && styles.datePickerRowActive,
                  pressed && styles.datePickerRowPressed,
                ]}
                onPress={() => openPicker("from")}
              >
                <View style={styles.datePickerIconWrap}>
                  <LinearGradient
                    colors={["#DBEAFE", "#EFF6FF"]}
                    style={styles.datePickerIcon}
                  >
                    <Calendar size={16} color="#3B82F6" strokeWidth={2} />
                  </LinearGradient>
                </View>
                <View style={styles.datePickerTextWrap}>
                  <Text style={styles.datePickerLabel}>Departure</Text>
                  <Text style={styles.datePickerValue}>
                    {toLabel(formData.dateFrom)}
                  </Text>
                </View>
                <ChevronRight size={18} color="#94A3B8" strokeWidth={2} />
              </Pressable>

              <View style={styles.datesDivider} />

              {/* Return by date row */}
              <Pressable
                style={({ pressed }) => [
                  styles.datePickerRow,
                  activePicker === "to" && styles.datePickerRowActive,
                  pressed && styles.datePickerRowPressed,
                ]}
                onPress={() => openPicker("to")}
              >
                <View style={styles.datePickerIconWrap}>
                  <LinearGradient
                    colors={["#EFF6FF", "#F0F6FF"]}
                    style={styles.datePickerIcon}
                  >
                    <CornerDownLeft size={16} color="#3B82F6" strokeWidth={2} />
                  </LinearGradient>
                </View>
                <View style={styles.datePickerTextWrap}>
                  <Text style={styles.datePickerLabel}>
                    {formData.tripType === "roundtrip"
                      ? "Latest return by"
                      : "Latest departure by"}
                  </Text>
                  <Text style={styles.datePickerValue}>
                    {toLabel(formData.dateTo)}
                  </Text>
                </View>
                <ChevronRight size={18} color="#94A3B8" strokeWidth={2} />
              </Pressable>

              {/* Combo preview pill */}
              {comboInfo.count > 0 && !comboInfo.overLimit && (
                <View style={styles.comboPill}>
                  <Text style={styles.comboPillText}>
                    {comboInfo.count} date combo
                    {comboInfo.count !== 1 ? "s" : ""}
                  </Text>
                </View>
              )}
              {comboInfo.overLimit && (
                <View style={[styles.comboPill, styles.comboPillOver]}>
                  <Text style={[styles.comboPillText, styles.comboPillTextOver]}>
                    Too many combinations — narrow your date range
                  </Text>
                </View>
              )}

              {formData.tripType === "roundtrip" && (
                <View style={styles.sectionNextWrap}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.sectionNextBtn,
                      pressed && styles.sectionNextBtnPressed,
                    ]}
                    onPress={handleDatesNext}
                  >
                    <Text style={styles.sectionNextBtnText}>Continue</Text>
                    <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.5} />
                  </Pressable>
                </View>
              )}
            </WizardSection>

            {/* ──────────────────────────────────────────────
                STEP 3: Nights (round trip only)
            ────────────────────────────────────────────── */}
            {formData.tripType === "roundtrip" && (
              <WizardSection
                section="nights"
                active={isSectionActive("nights")}
                done={isSectionDone("nights")}
                title="Trip length"
                summary={nightsSummary}
                onHeaderPress={() => goToSection("nights")}
                isLastSection={sectionOrder.indexOf("nights") === sectionOrder.length - 1}
              >
                <View style={styles.nightsInner}>
                  {/* Min nights */}
                  <View style={styles.sliderGroup}>
                    <View style={styles.sliderHeader}>
                      <Text style={styles.sliderLabel}>Min nights</Text>
                      <Text style={styles.sliderValue}>{formData.minNights}</Text>
                    </View>
                    <Slider
                      style={styles.slider}
                      minimumValue={1}
                      maximumValue={Math.max(1, maxPossibleNights)}
                      step={1}
                      value={Number(formData.minNights)}
                      onValueChange={handleMinNightsChange}
                      minimumTrackTintColor="#2563EB"
                      maximumTrackTintColor="#E2E8F0"
                      thumbTintColor="#2563EB"
                    />
                  </View>

                  {/* Max nights */}
                  <View style={styles.sliderGroup}>
                    <View style={styles.sliderHeader}>
                      <Text style={styles.sliderLabel}>Max nights</Text>
                      <Text style={styles.sliderValue}>{formData.maxNights}</Text>
                    </View>
                    <Slider
                      style={styles.slider}
                      minimumValue={1}
                      maximumValue={Math.max(1, maxPossibleNights)}
                      step={1}
                      value={Number(formData.maxNights)}
                      onValueChange={handleMaxNightsChange}
                      minimumTrackTintColor="#2563EB"
                      maximumTrackTintColor="#E2E8F0"
                      thumbTintColor="#2563EB"
                    />
                  </View>
                </View>
              </WizardSection>
            )}

            {/* ──────────────────────────────────────────────
                Advanced filters (collapsible, not a wizard step)
            ────────────────────────────────────────────── */}
            <Pressable
              style={styles.advancedToggle}
              onPress={() => {
                haptics.selection();
                LayoutAnimation.configureNext(
                  LayoutAnimation.Presets.easeInEaseOut
                );
                setShowAdvancedFilters((v) => !v);
              }}
            >
              <Text style={styles.advancedToggleText}>
                {activeFilterCount > 0
                  ? `Filters (${activeFilterCount})`
                  : "Advanced filters"}
              </Text>
              {showAdvancedFilters ? (
                <ChevronUp size={14} color="#64748B" strokeWidth={2} />
              ) : (
                <ChevronDown size={14} color="#64748B" strokeWidth={2} />
              )}
            </Pressable>

            {showAdvancedFilters && (
              <View style={styles.advancedContent}>
                {/* Stops */}
                <Text style={styles.filterGroupLabel}>Stops</Text>
                <View style={styles.chipRow}>
                  {(
                    [
                      { label: "Any", val: undefined },
                      { label: "Nonstop", val: 1 as const },
                      { label: "1 stop max", val: 2 as const },
                    ] as const
                  ).map((opt) => (
                    <Pressable
                      key={String(opt.val)}
                      style={({ pressed }) => [
                        styles.chip,
                        formData.apiFilters.stops === opt.val &&
                          styles.chipActive,
                        pressed && styles.chipPressed,
                      ]}
                      onPress={() => {
                        haptics.light();
                        updateForm({
                          apiFilters: {
                            ...formData.apiFilters,
                            stops: opt.val,
                          },
                        });
                      }}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          formData.apiFilters.stops === opt.val &&
                            styles.chipTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Carry-on toggle */}
                <View style={styles.filterToggleRow}>
                  <View>
                    <Text style={styles.filterGroupLabel}>Carry-on included</Text>
                    <Text style={styles.filterGroupSub}>
                      Only show fares with carry-on
                    </Text>
                  </View>
                  <ToggleSwitch
                    value={!!formData.apiFilters.bags}
                    onToggle={() => {
                      haptics.light();
                      updateForm({
                        apiFilters: {
                          ...formData.apiFilters,
                          bags: !formData.apiFilters.bags,
                        },
                      });
                    }}
                  />
                </View>

                {/* Max Duration */}
                <Text style={[styles.filterGroupLabel, { marginTop: 4 }]}>
                  Max flight duration
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.durationScroll}
                  contentContainerStyle={styles.durationScrollContent}
                >
                  {DURATION_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.value}
                      style={[
                        styles.chip,
                        (formData.apiFilters.maxDuration ?? 0) ===
                          opt.value && styles.chipActive,
                      ]}
                      onPress={() => {
                        haptics.light();
                        updateForm({
                          apiFilters: {
                            ...formData.apiFilters,
                            maxDuration: opt.value || undefined,
                          },
                        });
                      }}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          (formData.apiFilters.maxDuration ?? 0) ===
                            opt.value && styles.chipTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>

                {/* Airlines */}
                <Text style={[styles.filterGroupLabel, { marginTop: 12 }]}>
                  Airlines
                </Text>
                <View style={styles.airlineModeRow}>
                  {(["include", "exclude"] as const).map((mode) => (
                    <Pressable
                      key={mode}
                      style={[
                        styles.chip,
                        (formData.apiFilters.airlineMode ?? "include") ===
                          mode && styles.chipActive,
                      ]}
                      onPress={() => {
                        haptics.light();
                        updateForm({
                          apiFilters: {
                            ...formData.apiFilters,
                            airlineMode: mode,
                          },
                        });
                      }}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          (formData.apiFilters.airlineMode ?? "include") ===
                            mode && styles.chipTextActive,
                        ]}
                      >
                        {mode === "include" ? "Include only" : "Exclude"}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <TextInput
                  style={styles.airlineTextInput}
                  placeholder="e.g. UA, DL, AA"
                  placeholderTextColor="#94A3B8"
                  value={airlineInput}
                  onChangeText={(text) => {
                    setAirlineInput(text);
                    updateForm({
                      apiFilters: { ...formData.apiFilters, airlines: text },
                    });
                  }}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="done"
                />
                <Text style={styles.airlineHint}>
                  Enter IATA airline codes separated by commas
                </Text>
              </View>
            )}
          </View>

          {/* ================================================================
              CREDIT COST + ERROR
          ================================================================ */}
          {comboInfo.count > 0 && (
            <View style={styles.creditLine}>
              {comboInfo.overLimit ? (
                <Text style={styles.creditLineOver}>
                  {comboInfo.count} combinations exceeds the maximum of{" "}
                  {COMBO_HARD_CAP}. Please narrow your date range or nights.
                </Text>
              ) : comboInfo.isFreeSearch ? (
                <Text style={styles.creditLineFree}>
                  Free — your first search!
                </Text>
              ) : (
                <>
                  <Text style={styles.creditLineText}>
                    Search: {comboInfo.searchCost} credits
                  </Text>
                  {!comboInfo.canAfford && (
                    <Pressable onPress={() => setCreditsModalVisible(true)}>
                      <Text style={styles.creditLineInsufficient}>
                        Not enough credits — you have {balance ?? 0}, need{" "}
                        {comboInfo.searchCost}.{" "}
                        <Text style={styles.creditLineBuyLink}>Buy more</Text>
                      </Text>
                    </Pressable>
                  )}
                </>
              )}
            </View>
          )}

          {error ? (
            <View style={styles.errorWrap}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Search button */}
          <View style={styles.searchBtnWrap}>
            <AppButton
              label={isSearching ? "Search in progress..." : "Search Flights"}
              onPress={handleSearch}
              disabled={!isValid || comboInfo.overLimit || isSearching}
            />
          </View>

          <View style={{ height: 48 }} />
        </ScrollView>
      )}

      {step === "searching" &&
        formData.origin &&
        formData.destination && (
          <SearchingOverlay
            origin={formData.origin.iata}
            destination={formData.destination.iata}
            comboCount={comboInfo.count}
            onContinueBrowsing={handleContinueBrowsing}
          />
        )}

      {/* Insufficient credits modal */}
      <InsufficientCreditsModal
        visible={creditsModalVisible}
        onClose={() => setCreditsModalVisible(false)}
        needed={comboInfo.searchCost}
        balance={balance ?? 0}
      />

      {/* Airport search modal */}
      <AirportSearchModal
        visible={airportModalVisible}
        label={airportModalField}
        onSelect={handleAirportSelect}
        onClose={closeAirportModal}
      />

      {/* Bottom sheet date picker — uses Modal to isolate native DateTimePicker */}
      <Modal
        visible={datePickerVisible}
        transparent
        animationType="slide"
        onRequestClose={closePicker}
      >
        <View style={styles.pickerOverlay}>
          <Pressable style={styles.pickerBackdrop} onPress={closePicker} />
          <View style={styles.pickerSheet}>
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
              <CalendarPicker
                key={activePicker}
                value={
                  activePicker === "from" ? formData.dateFrom : formData.dateTo
                }
                minimumDate={
                  activePicker === "to"
                    ? addDays(formData.dateFrom, 1)
                    : new Date()
                }
                accentColor="#3B82F6"
                onChange={onDateChange}
              />
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ---------------------------------------------------------------------------
// WizardSection — collapsible step container with numbered indicator
// ---------------------------------------------------------------------------

interface WizardSectionProps {
  section: SectionId;
  active: boolean;
  done: boolean;
  title: string;
  summary: string;
  onHeaderPress: () => void;
  children: React.ReactNode;
  isLastSection: boolean;
}

function WizardSection({
  section,
  active,
  done,
  title,
  summary,
  onHeaderPress,
  children,
  isLastSection,
}: WizardSectionProps) {
  return (
    <View style={wizStyles.container}>
      {/* Left column: icon + connector */}
      <View style={wizStyles.leftCol}>
        <StepIndicator section={section} active={active} done={done} />
        {!isLastSection && (
          <View
            style={[
              wizStyles.connector,
              (active || done) && wizStyles.connectorActive,
            ]}
          />
        )}
      </View>

      {/* Right column: header + content */}
      <View style={wizStyles.rightCol}>
        {/* Tappable header — always visible */}
        <Pressable
          onPress={onHeaderPress}
          style={({ pressed }) => [
            wizStyles.header,
            pressed && wizStyles.headerPressed,
          ]}
          hitSlop={4}
        >
          <View style={wizStyles.headerText}>
            <Text
              style={[
                wizStyles.title,
                active && wizStyles.titleActive,
                done && wizStyles.titleDone,
              ]}
            >
              {title}
            </Text>
            {!active && (
              <Text
                style={[
                  wizStyles.summary,
                  done && wizStyles.summaryDone,
                ]}
                numberOfLines={1}
              >
                {summary}
              </Text>
            )}
          </View>
          {done && !active && (
            <Text style={wizStyles.editLabel}>Edit</Text>
          )}
        </Pressable>

        {/* Expandable content */}
        <AnimatedSection expanded={active}>
          <View style={wizStyles.content}>{children}</View>
        </AnimatedSection>
      </View>
    </View>
  );
}

const wizStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginBottom: 4,
  },
  leftCol: {
    width: 32,
    alignItems: "center",
  },
  connector: {
    flex: 1,
    width: 1.5,
    backgroundColor: "#E2E8F0",
    marginTop: 6,
    marginBottom: 0,
    minHeight: 24,
  },
  connectorActive: {
    backgroundColor: "#93C5FD",
  },
  rightCol: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingRight: 4,
    borderRadius: 8,
  },
  headerPressed: {
    opacity: 0.7,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 15,
    color: "#94A3B8",
    marginBottom: 2,
  },
  titleActive: {
    fontFamily: "Outfit_700Bold",
    fontSize: 17,
    color: "#0F172A",
  },
  titleDone: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 15,
    color: "#64748B",
  },
  summary: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: "#94A3B8",
  },
  summaryDone: {
    fontFamily: "Outfit_500Medium",
    color: "#3B82F6",
  },
  editLabel: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: "#3B82F6",
    paddingLeft: 12,
  },
  content: {
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
});

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

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

  // Nav
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  screenTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 17,
    color: "#0F172A",
  },

  // Trip type pill toggle
  tripToggleRow: {
    flexDirection: "row",
    backgroundColor: "#E8F0FE",
    borderRadius: 12,
    padding: 4,
    marginBottom: 28,
  },
  tripToggleOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: "center",
  },
  tripToggleOptionActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  tripToggleText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 14,
    color: "#64748B",
  },
  tripToggleTextActive: {
    fontFamily: "Outfit_700Bold",
    color: "#0F172A",
  },

  // Wizard container
  wizardContainer: {
    position: "relative",
    marginBottom: 20,
  },
  connectorLine: {
    position: "absolute",
    left: 15,
    top: 32,
    bottom: 32,
    width: 1.5,
    backgroundColor: "#E2E8F0",
    zIndex: 0,
  },

  // Step indicator (floating icon)
  stepIndicator: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
    backgroundColor: "#F0F6FF",
    borderRadius: 16,
  },
  stepIndicatorActive: {
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },

  // Airport rows
  airportRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  airportRowPressed: {
    backgroundColor: "rgba(59, 130, 246, 0.04)",
  },
  airportIconWrap: {
    marginRight: 14,
  },
  airportIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  airportIconText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    color: "#3B82F6",
  },
  airportTextWrap: {
    flex: 1,
  },
  airportFieldLabel: {
    fontFamily: "Outfit_700Bold",
    fontSize: 10,
    color: "#94A3B8",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  airportSelected: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  airportCode: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 22,
    color: "#0F172A",
    letterSpacing: 1.5,
  },
  airportCity: {
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
    color: "#64748B",
    flex: 1,
  },
  airportPlaceholder: {
    fontFamily: "Outfit_400Regular",
    fontSize: 15,
    color: "#CBD5E1",
  },
  airportChevron: {
    fontFamily: "Outfit_300Light",
    fontSize: 22,
    color: "#CBD5E1",
    marginLeft: 8,
  },
  airportDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginLeft: 70,
  },

  // Date picker rows
  datePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  datePickerRowActive: {
    backgroundColor: "rgba(59, 130, 246, 0.04)",
  },
  datePickerRowPressed: {
    backgroundColor: "rgba(59, 130, 246, 0.04)",
  },
  datePickerIconWrap: {
    marginRight: 14,
  },
  datePickerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  datePickerIconText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 16,
    color: "#3B82F6",
  },
  datePickerTextWrap: {
    flex: 1,
  },
  datePickerLabel: {
    fontFamily: "Outfit_500Medium",
    fontSize: 12,
    color: "#94A3B8",
    marginBottom: 3,
  },
  datePickerValue: {
    fontFamily: "Outfit_700Bold",
    fontSize: 17,
    color: "#0F172A",
  },
  datePickerChevron: {
    fontFamily: "Outfit_300Light",
    fontSize: 22,
    color: "#CBD5E1",
    marginLeft: 8,
  },
  datesDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginLeft: 70,
  },

  // Combo pill
  comboPill: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    backgroundColor: "#EFF6FF",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
  },
  comboPillOver: {
    backgroundColor: "#FEF2F2",
    alignSelf: "stretch",
  },
  comboPillText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 12,
    color: "#3B82F6",
  },
  comboPillTextOver: {
    color: "#DC2626",
  },

  // Section next button
  sectionNextWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    alignItems: "flex-end",
  },
  sectionNextBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#3B82F6",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  sectionNextBtnPressed: {
    backgroundColor: "#2563EB",
    transform: [{ scale: 0.97 }],
  },
  sectionNextBtnDisabled: {
    backgroundColor: "#93C5FD",
  },
  sectionNextBtnText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
    color: "#FFFFFF",
  },
  sectionNextBtnTextDisabled: {
    color: "rgba(255,255,255,0.7)",
  },
  sectionNextBtnChevron: {
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
    color: "#FFFFFF",
  },

  // Nights sliders
  nightsInner: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
    gap: 16,
  },
  sliderGroup: {
    gap: 0,
  },
  sliderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sliderLabel: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 15,
    color: "#0F172A",
  },
  sliderValue: {
    fontFamily: "Outfit_700Bold",
    fontSize: 20,
    color: "#2563EB",
    minWidth: 28,
    textAlign: "right",
  },
  slider: {
    width: "100%",
    height: 40,
  },

  // Preferences / filters
  filterGroupLabel: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: "#64748B",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  filterGroupSub: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: "#94A3B8",
    paddingHorizontal: 16,
    marginTop: -4,
    marginBottom: 4,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chipActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
  },
  chipPressed: {
    opacity: 0.75,
  },
  chipText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
    color: "#64748B",
  },
  chipTextActive: {
    fontFamily: "Outfit_600SemiBold",
    color: "#3B82F6",
  },
  filterToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    marginTop: 4,
  },

  // Toggle switch
  switchTrack: {
    width: 46,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
  },
  switchTrackOn: {
    backgroundColor: "#3B82F6",
  },
  switchKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },

  // Advanced filters toggle
  advancedToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
    marginTop: 4,
  },
  advancedToggleText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
    color: "#64748B",
  },
  advancedContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  durationScroll: {
    paddingLeft: 16,
  },
  durationScrollContent: {
    paddingRight: 16,
    gap: 8,
    flexDirection: "row",
  },
  airlineModeRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  airlineTextInput: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: "#0F172A",
    backgroundColor: "#FAFCFF",
  },
  airlineHint: {
    fontFamily: "Outfit_400Regular",
    fontSize: 11,
    color: "#94A3B8",
    paddingHorizontal: 16,
    marginTop: 5,
    marginBottom: 12,
  },

  // Credit summary card
  creditLine: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  creditLineFree: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: "#22C55E",
  },
  creditLineText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 14,
    color: "#64748B",
  },
  creditLineOver: {
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
    color: "#DC2626",
    lineHeight: 18,
  },
  creditLineInsufficient: {
    fontFamily: "Outfit_500Medium",
    fontSize: 12,
    color: "#DC2626",
    marginTop: 4,
  },
  creditLineBuyLink: {
    fontFamily: "Outfit_600SemiBold",
    color: "#2F9CF4",
    textDecorationLine: "underline" as const,
  },

  // Error
  errorWrap: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorText: {
    fontFamily: "Outfit_400Regular",
    color: "#DC2626",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },

  // Search button
  searchBtnWrap: {
    marginTop: 4,
  },

  // Date picker bottom sheet (inside Modal)
  pickerOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  pickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.3)",
  },
  pickerSheet: {
    height: SHEET_HEIGHT,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
    fontFamily: "Outfit_700Bold",
    fontSize: 17,
    color: "#0F172A",
  },
  sheetDoneBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  sheetDoneBtnText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    color: "#3B82F6",
  },
});
