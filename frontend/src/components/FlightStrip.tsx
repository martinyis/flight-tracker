import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Linking,
  StyleSheet,
  Animated,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AirlineLogo from "./AirlineLogo";
import { fonts } from "../utils/fonts";
import {
  buildDeepLinkFromFlights,
  buildGoogleFlightsSearchUrl,
} from "../utils/googleFlightsUrl";

// ---------------------------------------------------------------------------
// Types (same as the old FlightResultCard -- kept local for encapsulation)
// ---------------------------------------------------------------------------

interface SerpFlight {
  airline: string;
  airline_logo?: string;
  flight_number?: string;
  departure_airport?: { name: string; id: string; time: string };
  arrival_airport?: { name: string; id: string; time: string };
}

export interface FlightLeg {
  date: string;
  price: number;
  airline: string;
  airline_logo?: string;
  departure_time: string;
  arrival_time: string;
  duration: number;
  stops: number;
  flights?: SerpFlight[];
  departure_token?: string;
  booking_token?: string;
}

export interface Combo {
  outbound: FlightLeg;
  return: FlightLeg;
  totalPrice: number;
  nights: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveLogoUrl(
  leg: FlightLeg,
  airlineLogos?: Record<string, string>
): string | undefined {
  return (
    leg.airline_logo ||
    leg.flights?.[0]?.airline_logo ||
    airlineLogos?.[leg.airline]
  );
}

function formatDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}m`;
}

function formatTime(raw: string): string {
  const timePart = raw.includes(" ") ? raw.split(" ").pop()! : raw;
  const [hStr, mStr] = timePart.split(":");
  const h = parseInt(hStr, 10);
  const m = mStr ?? "00";
  if (isNaN(h)) return raw;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m} ${suffix}`;
}

/** Compact time: "5:40p" instead of "5:40 PM" */
function formatTimeCompact(raw: string): string {
  const timePart = raw.includes(" ") ? raw.split(" ").pop()! : raw;
  const [hStr, mStr] = timePart.split(":");
  const h = parseInt(hStr, 10);
  const m = mStr ?? "00";
  if (isNaN(h)) return raw;
  const suffix = h >= 12 ? "p" : "a";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m}${suffix}`;
}

function formatDateShort(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function stopsLabel(stops: number): string {
  if (stops === 0) return "Nonstop";
  return `${stops} stop${stops > 1 ? "s" : ""}`;
}

function buildFallbackUrl(
  origin: string,
  destination: string,
  date: string,
  returnDate?: string
) {
  return buildGoogleFlightsSearchUrl(origin, destination, date, returnDate);
}

// ---------------------------------------------------------------------------
// Expanded detail: flight path visualization (reused from old component)
// ---------------------------------------------------------------------------

function FlightPath({
  departureTime,
  arrivalTime,
  duration,
  stops,
}: {
  departureTime: string;
  arrivalTime: string;
  duration: number;
  stops: number;
}) {
  return (
    <View style={pathStyles.container}>
      <View style={pathStyles.timeRow}>
        <Text style={pathStyles.time}>{formatTime(departureTime)}</Text>
        <View style={pathStyles.track}>
          <View style={pathStyles.dot} />
          <View style={pathStyles.line} />
          {stops > 0 && <View style={pathStyles.stopDot} />}
          {stops > 0 && <View style={pathStyles.line} />}
          <View style={pathStyles.dot} />
        </View>
        <Text style={pathStyles.time}>{formatTime(arrivalTime)}</Text>
      </View>
      <View style={pathStyles.metaRow}>
        <Text style={pathStyles.meta}>{formatDuration(duration)}</Text>
        <View style={pathStyles.metaSep} />
        <Text style={[pathStyles.meta, stops === 0 && pathStyles.metaGreen]}>
          {stopsLabel(stops)}
        </Text>
      </View>
    </View>
  );
}

const pathStyles = StyleSheet.create({
  container: {
    marginTop: 4,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  time: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: "#0F172A",
    letterSpacing: -0.3,
    minWidth: 68,
  },
  track: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 40,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#94A3B8",
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(148, 163, 184, 0.35)",
  },
  stopDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#F59E0B",
    marginHorizontal: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    paddingLeft: 78,
  },
  meta: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: "#94A3B8",
    letterSpacing: -0.1,
  },
  metaSep: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#CBD5E1",
  },
  metaGreen: {
    color: "#22C55E",
  },
});

// ---------------------------------------------------------------------------
// Booking action handler (extracted for reuse)
// ---------------------------------------------------------------------------

function openBookingLink(opts: {
  outbound: FlightLeg;
  returnLeg?: FlightLeg;
  origin: string;
  destination: string;
}) {
  const hasSegmentData =
    opts.outbound.flights?.length &&
    opts.outbound.flights.some((f) => f.flight_number && f.departure_airport);

  if (hasSegmentData) {
    const url = buildDeepLinkFromFlights({
      outbound: {
        date: opts.outbound.date,
        flights: opts.outbound.flights as Array<{
          flight_number: string;
          departure_airport: { id: string };
          arrival_airport: { id: string };
        }>,
      },
      returnLeg: opts.returnLeg?.flights?.length
        ? {
            date: opts.returnLeg.date,
            flights: opts.returnLeg.flights as Array<{
              flight_number: string;
              departure_airport: { id: string };
              arrival_airport: { id: string };
            }>,
          }
        : undefined,
      origin: opts.origin,
      destination: opts.destination,
    });
    Linking.openURL(url);
  } else {
    Linking.openURL(
      buildFallbackUrl(
        opts.origin,
        opts.destination,
        opts.outbound.date,
        opts.returnLeg?.date
      )
    );
  }
}

// ---------------------------------------------------------------------------
// Expanded section for a single leg inside the accordion
// ---------------------------------------------------------------------------

function ExpandedLeg({
  leg,
  label,
  airlineLogos,
}: {
  leg: FlightLeg;
  label: string;
  airlineLogos?: Record<string, string>;
}) {
  return (
    <View style={expandedStyles.legSection}>
      {/* Label + date */}
      <View style={expandedStyles.legHeader}>
        <Text style={expandedStyles.legLabel}>{label}</Text>
        <Text style={expandedStyles.legDate}>{formatDate(leg.date)}</Text>
      </View>

      {/* Airline row */}
      <View style={expandedStyles.airlineRow}>
        <AirlineLogo
          airline={leg.airline}
          logoUrl={resolveLogoUrl(leg, airlineLogos)}
          size={22}
        />
        <Text style={expandedStyles.airlineName} numberOfLines={1}>
          {leg.airline}
        </Text>
      </View>

      {/* Full flight path visualization */}
      <FlightPath
        departureTime={leg.departure_time}
        arrivalTime={leg.arrival_time}
        duration={leg.duration}
        stops={leg.stops}
      />
    </View>
  );
}

const expandedStyles = StyleSheet.create({
  legSection: {
    marginBottom: 16,
  },
  legHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  legLabel: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  legDate: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: "#94A3B8",
  },
  airlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  airlineName: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: "#0F172A",
    letterSpacing: -0.1,
    flex: 1,
  },
  bookBtn: {
    marginTop: 14,
    backgroundColor: "#3B82F6",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    // 44pt minimum touch target per iOS HIG
    minHeight: 44,
  },
  bookBtnPressed: {
    backgroundColor: "#2563EB",
    transform: [{ scale: 0.985 }],
  },
  bookBtnText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: "#FFFFFF",
    letterSpacing: 0.1,
  },
});

// ---------------------------------------------------------------------------
// BOOK BUTTONS -- one for round-trip combos, one for one-way legs
// ---------------------------------------------------------------------------

function RoundTripBookButton({
  combo,
  origin,
  destination,
}: {
  combo: Combo;
  origin: string;
  destination: string;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        expandedStyles.bookBtn,
        pressed && expandedStyles.bookBtnPressed,
      ]}
      onPress={() =>
        openBookingLink({
          outbound: combo.outbound,
          returnLeg: combo.return,
          origin,
          destination,
        })
      }
    >
      <Text style={expandedStyles.bookBtnText}>Book on Google Flights</Text>
    </Pressable>
  );
}

function OneWayBookButton({
  leg,
  origin,
  destination,
}: {
  leg: FlightLeg;
  origin: string;
  destination: string;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        expandedStyles.bookBtn,
        pressed && expandedStyles.bookBtnPressed,
      ]}
      onPress={() =>
        openBookingLink({
          outbound: leg,
          origin,
          destination,
        })
      }
    >
      <Text style={expandedStyles.bookBtnText}>Book on Google Flights</Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// ACCORDION WRAPPER -- animates height from 0 to measured content height.
// Children are only mounted when expanded or animating out (lazy rendering).
// ---------------------------------------------------------------------------

function AccordionBody({
  expanded,
  children,
}: {
  expanded: boolean;
  children: React.ReactNode;
}) {
  const animValue = useRef(new Animated.Value(0)).current;
  const [contentHeight, setContentHeight] = useState(0);
  // Track whether children should be rendered (true while expanded OR
  // while the collapse animation is still in progress)
  const [shouldRender, setShouldRender] = useState(expanded);

  useEffect(() => {
    if (expanded) {
      // Mount children immediately so we can measure them
      setShouldRender(true);
    }

    Animated.timing(animValue, {
      toValue: expanded ? 1 : 0,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // height animation cannot use native driver
    }).start(({ finished }) => {
      // When collapse finishes, unmount children to free memory
      if (finished && !expanded) {
        setShouldRender(false);
      }
    });
  }, [expanded]);

  const height =
    contentHeight > 0
      ? animValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0, contentHeight],
        })
      : expanded
      ? undefined // Auto-height while measuring
      : 0;

  const opacity = animValue.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0, 1],
  });

  if (!shouldRender) return null;

  return (
    <Animated.View
      style={{
        height,
        opacity,
        overflow: "hidden",
      }}
    >
      <View
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (h > 0 && Math.abs(h - contentHeight) > 2) {
            setContentHeight(h);
          }
        }}
      >
        {children}
      </View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// COMPACT LEG ROW -- the inline summary for a single flight leg
// Shown within the collapsed strip: times + stops + duration
// ---------------------------------------------------------------------------

function CompactLegRow({
  leg,
  isCheapest,
}: {
  leg: FlightLeg;
  isCheapest: boolean;
}) {
  const timeColor = isCheapest ? "#0F172A" : "#334155";
  return (
    <View style={compactLeg.row}>
      <Text style={[compactLeg.times, { color: timeColor }]}>
        {formatTimeCompact(leg.departure_time)}
        {" \u2013 "}
        {formatTimeCompact(leg.arrival_time)}
      </Text>
      <View style={compactLeg.metaSep} />
      <Text style={[compactLeg.meta, leg.stops === 0 && compactLeg.metaGreen]}>
        {stopsLabel(leg.stops)}
      </Text>
      <View style={compactLeg.metaSep} />
      <Text style={compactLeg.meta}>{formatDuration(leg.duration)}</Text>
    </View>
  );
}

const compactLeg = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
    marginTop: 2,
  },
  times: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    letterSpacing: -0.2,
  },
  meta: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: "#94A3B8",
    letterSpacing: -0.1,
  },
  metaSep: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#CBD5E1",
    marginHorizontal: 6,
  },
  metaGreen: {
    color: "#22C55E",
  },
});

// ---------------------------------------------------------------------------
// View-based chevron icon for expand/collapse indicator
// ---------------------------------------------------------------------------

function ChevronDown({
  expanded,
  color = "#94A3B8",
}: {
  expanded: boolean;
  color?: string;
}) {
  const rotation = useRef(new Animated.Value(expanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(rotation, {
      toValue: expanded ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [expanded]);

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <Animated.View
      style={{
        width: 18,
        height: 18,
        alignItems: "center",
        justifyContent: "center",
        transform: [{ rotate }],
      }}
    >
      <View
        style={{
          width: 8,
          height: 8,
          borderRightWidth: 2,
          borderBottomWidth: 2,
          borderColor: color,
          transform: [{ rotate: "45deg" }],
          marginTop: -3,
        }}
      />
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// ROUND-TRIP STRIP
// ---------------------------------------------------------------------------

export function RoundTripStrip({
  item,
  index,
  origin,
  destination,
  isCheapest,
  isExpanded,
  onToggle,
  airlineLogos,
}: {
  item: Combo;
  index: number;
  origin: string;
  destination: string;
  isCheapest: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  airlineLogos?: Record<string, string>;
}) {
  // Zebra-stripe: even rows get a barely-perceptible warmer tint
  const isEven = index % 2 === 0;

  // Determine if outbound and return are the same airline
  const sameAirline = item.outbound.airline === item.return.airline;

  return (
    <View>
      {/* Luminous divider between strips (skip for first) */}
      {index > 0 && !isCheapest && (
        <View style={strip.divider} />
      )}

      {/* Cheapest: top accent bar */}
      {isCheapest && (
        <LinearGradient
          colors={["rgba(34, 197, 94, 0.35)", "rgba(59, 130, 246, 0.15)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={strip.cheapestAccent}
        />
      )}

      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [
          strip.container,
          isEven && strip.containerEven,
          !isEven && strip.containerOdd,
          isCheapest && strip.containerCheapest,
          pressed && strip.containerPressed,
        ]}
      >
        {/* === COLLAPSED SUMMARY === */}
        <View style={strip.summaryRow}>
          {/* Left: Price */}
          <View style={strip.priceBlock}>
            <Text
              style={[
                strip.price,
                isCheapest && strip.priceCheapest,
              ]}
            >
              ${item.totalPrice}
            </Text>
            {isCheapest && (
              <Text style={strip.cheapestLabel}>BEST</Text>
            )}
            {!isCheapest && (
              <Text style={strip.nightsLabel}>
                {item.nights}n
              </Text>
            )}
          </View>

          {/* Center: Airline + legs summary */}
          <View style={strip.infoBlock}>
            {/* Airline(s) row */}
            <View style={strip.airlineRow}>
              <AirlineLogo
                airline={item.outbound.airline}
                logoUrl={resolveLogoUrl(item.outbound, airlineLogos)}
                size={18}
              />
              {!sameAirline && (
                <>
                  <View style={strip.airlineSep} />
                  <AirlineLogo
                    airline={item.return.airline}
                    logoUrl={resolveLogoUrl(item.return, airlineLogos)}
                    size={18}
                  />
                </>
              )}
              <Text style={strip.airlineText} numberOfLines={1}>
                {sameAirline
                  ? item.outbound.airline
                  : `${item.outbound.airline} / ${item.return.airline}`}
              </Text>
            </View>

            {/* Outbound summary */}
            <CompactLegRow leg={item.outbound} isCheapest={isCheapest} />

            {/* Return summary */}
            <CompactLegRow leg={item.return} isCheapest={isCheapest} />
          </View>

          {/* Right: Expand chevron */}
          <View style={strip.chevronWrap}>
            <ChevronDown
              expanded={isExpanded}
              color={isCheapest ? "#16A34A" : "#94A3B8"}
            />
          </View>
        </View>

        {/* === EXPANDED DETAIL (accordion) === */}
        <AccordionBody expanded={isExpanded}>
          <View style={strip.expandedBody}>
            {/* Thin separator between summary and detail */}
            <View style={strip.expandedDivider} />

            {/* Nights pill */}
            <View style={strip.expandedMeta}>
              <Text style={strip.expandedNights}>
                {item.nights} night{item.nights !== 1 ? "s" : ""} in {destination}
              </Text>
            </View>

            {/* Outbound leg detail */}
            <ExpandedLeg
              leg={item.outbound}
              label="Outbound"
              airlineLogos={airlineLogos}
            />

            {/* Return leg detail */}
            <ExpandedLeg
              leg={item.return}
              label="Return"
              airlineLogos={airlineLogos}
            />

            {/* Single book button for the whole round trip */}
            <RoundTripBookButton
              combo={item}
              origin={origin}
              destination={destination}
            />
          </View>
        </AccordionBody>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// ONE-WAY STRIP
// ---------------------------------------------------------------------------

export function OneWayStrip({
  item,
  index,
  origin,
  destination,
  isCheapest,
  isExpanded,
  onToggle,
  airlineLogos,
}: {
  item: FlightLeg;
  index: number;
  origin: string;
  destination: string;
  isCheapest: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  airlineLogos?: Record<string, string>;
}) {
  const isEven = index % 2 === 0;

  return (
    <View>
      {/* Luminous divider between strips (skip for first) */}
      {index > 0 && !isCheapest && (
        <View style={strip.divider} />
      )}

      {/* Cheapest: top accent bar */}
      {isCheapest && (
        <LinearGradient
          colors={["rgba(34, 197, 94, 0.35)", "rgba(59, 130, 246, 0.15)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={strip.cheapestAccent}
        />
      )}

      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [
          strip.container,
          isEven && strip.containerEven,
          !isEven && strip.containerOdd,
          isCheapest && strip.containerCheapest,
          pressed && strip.containerPressed,
        ]}
      >
        {/* === COLLAPSED SUMMARY === */}
        <View style={strip.summaryRow}>
          {/* Left: Price */}
          <View style={strip.priceBlock}>
            <Text
              style={[
                strip.price,
                isCheapest && strip.priceCheapest,
              ]}
            >
              ${item.price}
            </Text>
            {isCheapest && (
              <Text style={strip.cheapestLabel}>BEST</Text>
            )}
            {!isCheapest && (
              <Text style={strip.nightsLabel}>
                {formatDateShort(item.date)}
              </Text>
            )}
          </View>

          {/* Center: Airline + leg summary */}
          <View style={strip.infoBlock}>
            <View style={strip.airlineRow}>
              <AirlineLogo
                airline={item.airline}
                logoUrl={resolveLogoUrl(item, airlineLogos)}
                size={18}
              />
              <Text style={strip.airlineText} numberOfLines={1}>
                {item.airline}
              </Text>
            </View>

            <CompactLegRow leg={item} isCheapest={isCheapest} />
          </View>

          {/* Right: Expand chevron */}
          <View style={strip.chevronWrap}>
            <ChevronDown
              expanded={isExpanded}
              color={isCheapest ? "#16A34A" : "#94A3B8"}
            />
          </View>
        </View>

        {/* === EXPANDED DETAIL (accordion) === */}
        <AccordionBody expanded={isExpanded}>
          <View style={strip.expandedBody}>
            <View style={strip.expandedDivider} />

            <ExpandedLeg
              leg={item}
              label="Flight"
              airlineLogos={airlineLogos}
            />

            {/* Book button for one-way */}
            <OneWayBookButton
              leg={item}
              origin={origin}
              destination={destination}
            />
          </View>
        </AccordionBody>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Shared strip styles
// ---------------------------------------------------------------------------

const strip = StyleSheet.create({
  // Luminous divider between rows -- razor thin with a subtle glow
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(148, 163, 184, 0.2)",
    marginHorizontal: 16,
  },

  // Cheapest top accent: 2.5px gradient bar
  cheapestAccent: {
    height: 2.5,
  },

  // Container: NO border radius, NO card shadow, edge-to-edge
  container: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  containerEven: {
    backgroundColor: "transparent",
  },
  containerOdd: {
    backgroundColor: "rgba(148, 163, 184, 0.03)",
  },
  containerCheapest: {
    backgroundColor: "rgba(34, 197, 94, 0.04)",
    // Lifted effect -- subtle shadow makes this row pop forward
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  containerPressed: {
    backgroundColor: "rgba(59, 130, 246, 0.04)",
  },

  // Summary row: the collapsed state
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  // Left price block: fixed width for column alignment
  priceBlock: {
    width: 72,
    marginRight: 14,
  },
  price: {
    fontFamily: fonts.extraBold,
    fontSize: 22,
    color: "#0F172A",
    letterSpacing: -0.8,
    lineHeight: 26,
  },
  priceCheapest: {
    fontSize: 26,
    color: "#16A34A",
    lineHeight: 30,
  },
  cheapestLabel: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: "#16A34A",
    letterSpacing: 1.2,
    marginTop: 2,
  },
  nightsLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
    letterSpacing: -0.1,
  },

  // Center info block: airline + legs summary
  infoBlock: {
    flex: 1,
  },
  airlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  airlineSep: {
    width: 1,
    height: 12,
    backgroundColor: "rgba(148, 163, 184, 0.3)",
    marginHorizontal: 2,
  },
  airlineText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: "#64748B",
    letterSpacing: -0.1,
    flex: 1,
  },

  // Chevron expand/collapse indicator
  chevronWrap: {
    width: 32,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  // Expanded detail body
  expandedBody: {
    paddingTop: 4,
  },
  expandedDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(148, 163, 184, 0.15)",
    marginBottom: 16,
    marginTop: 12,
  },
  expandedMeta: {
    marginBottom: 16,
  },
  expandedNights: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: "#64748B",
    letterSpacing: 0.1,
  },
});

// ---------------------------------------------------------------------------
// FLOATING LAYERS WRAPPER -- wraps the entire result list,
// provides the visual container around all strips
// ---------------------------------------------------------------------------

export function FloatingLayersContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <View style={container.wrap}>
      {children}
    </View>
  );
}

const container = StyleSheet.create({
  wrap: {
    // Stretch beyond horizontal padding to achieve edge-to-edge feel.
    // The parent (FlatList contentContainerStyle) has paddingHorizontal: 20,
    // so we negate it here.
    marginHorizontal: -20,
    // Very subtle outer shadow so the entire block has depth against the
    // mesh gradient background -- but NO border radius (slab feel)
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
    // Clip the last divider so it doesn't bleed past the bottom
    overflow: "hidden",
    // Subtle top and bottom border for the entire slab
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(148, 163, 184, 0.15)",
    backgroundColor: "rgba(255, 255, 255, 0.35)",
  },
});
