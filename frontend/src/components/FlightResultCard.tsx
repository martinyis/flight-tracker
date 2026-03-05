import {
  View,
  Text,
  Pressable,
  Linking,
  StyleSheet,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import AirlineLogo from "./AirlineLogo";
import { fonts } from "../utils/fonts";
import {
  buildDeepLinkFromFlights,
  buildGoogleFlightsSearchUrl,
} from "../utils/googleFlightsUrl";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SerpFlight {
  airline: string;
  airline_logo?: string;
  flight_number?: string;
  departure_airport?: { name: string; id: string; time: string };
  arrival_airport?: { name: string; id: string; time: string };
}

interface FlightLeg {
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

interface Combo {
  outbound: FlightLeg;
  return: FlightLeg;
  totalPrice: number;
  nights: number;
}

/** Resolve logo URL from multiple sources: leg-level, nested flights, or airlineLogos map */
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}m`;
}

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatDateShort(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** Format a time string like "2026-04-14 17:40" or "17:40" to compact "5:40 PM" */
function formatTime(raw: string): string {
  // If the string contains a space (datetime format), take only the time part
  const timePart = raw.includes(" ") ? raw.split(" ").pop()! : raw;
  const [hStr, mStr] = timePart.split(":");
  const h = parseInt(hStr, 10);
  const m = mStr ?? "00";
  if (isNaN(h)) return raw; // fallback: return original if unparseable
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m} ${suffix}`;
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
// Flight path visualization
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
    <View style={path.container}>
      <View style={path.timeRow}>
        <Text style={path.time}>{formatTime(departureTime)}</Text>
        <View style={path.track}>
          <View style={path.dot} />
          <View style={path.line} />
          {stops > 0 && <View style={path.stopDot} />}
          {stops > 0 && <View style={path.line} />}
          <View style={path.dot} />
        </View>
        <Text style={path.time}>{formatTime(arrivalTime)}</Text>
      </View>
      <View style={path.metaRow}>
        <Text style={path.meta}>{formatDuration(duration)}</Text>
        <View style={path.metaSep} />
        <Text style={[path.meta, stops === 0 && path.metaGreen]}>
          {stops === 0 ? "Nonstop" : `${stops} stop${stops > 1 ? "s" : ""}`}
        </Text>
      </View>
    </View>
  );
}

const path = StyleSheet.create({
  container: {
    marginTop: 8,
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
    minWidth: 68, // Accommodates widest time like "12:00 AM"
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
    paddingLeft: 78, // Aligns with track line (minWidth 68 + gap 10)
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
// LegCard -- inner card for a single flight leg
// ---------------------------------------------------------------------------

/** Display-only leg card (no individual booking button). */
function LegCard({
  leg,
  airlineLogos,
}: {
  leg: FlightLeg;
  airlineLogos?: Record<string, string>;
}) {
  return (
    <View style={legStyles.wrap}>
      {/* Header row */}
      <View style={legStyles.headerRow}>
        <AirlineLogo
          airline={leg.airline}
          logoUrl={resolveLogoUrl(leg, airlineLogos)}
          size={28}
        />
        <View style={legStyles.headerInfo}>
          <Text style={legStyles.airline} numberOfLines={1}>
            {leg.airline}
          </Text>
          <Text style={legStyles.dateLabel}>
            {formatDate(leg.date)}
          </Text>
        </View>
      </View>

      {/* Flight path */}
      <FlightPath
        departureTime={leg.departure_time}
        arrivalTime={leg.arrival_time}
        duration={leg.duration}
        stops={leg.stops}
      />
    </View>
  );
}

const legStyles = StyleSheet.create({
  wrap: {
    backgroundColor: "rgba(248, 250, 255, 0.65)",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(224, 232, 255, 0.5)",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerInfo: {
    flex: 1,
  },
  airline: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: "#0F172A",
    letterSpacing: -0.1,
  },
  dateLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 1,
  },
});

// ---------------------------------------------------------------------------
// "Cheapest" badge
// ---------------------------------------------------------------------------

function CheapestBadge() {
  return (
    <View style={cheapestStyles.wrap}>
      <LinearGradient
        colors={["rgba(34, 197, 94, 0.12)", "rgba(34, 197, 94, 0.06)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={cheapestStyles.gradient}
      >
        <Text style={cheapestStyles.text}>Cheapest</Text>
      </LinearGradient>
    </View>
  );
}

const cheapestStyles = StyleSheet.create({
  wrap: {
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.2)",
  },
  gradient: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  text: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: "#16A34A",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
});

// ---------------------------------------------------------------------------
// Booking handler + buttons
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

function RoundTripBookBtn({
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
        bookBtnStyles.btn,
        pressed && bookBtnStyles.pressed,
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
      <Text style={bookBtnStyles.text}>Book on Google Flights</Text>
    </Pressable>
  );
}

const bookBtnStyles = StyleSheet.create({
  btn: {
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  pressed: {
    backgroundColor: "#2563EB",
    transform: [{ scale: 0.985 }],
  },
  text: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: "#FFFFFF",
    letterSpacing: 0.1,
  },
});

// ---------------------------------------------------------------------------
// Main card: FlightResultCard (round-trip combo)
// ---------------------------------------------------------------------------

export default function FlightResultCard({
  item,
  origin,
  destination,
  isCheapest = false,
  airlineLogos,
}: {
  item: Combo;
  origin: string;
  destination: string;
  isCheapest?: boolean;
  airlineLogos?: Record<string, string>;
}) {
  return (
    <View style={[card.shadow, isCheapest && card.shadowCheapest]}>
      <BlurView intensity={60} tint="light" style={card.blurWrap}>
        <View style={card.inner}>
          {/* Price row */}
          <View style={card.priceRow}>
            <View style={card.priceLeft}>
              {isCheapest && <CheapestBadge />}
              <Text style={[card.price, isCheapest && card.priceCheapest]}>
                ${item.totalPrice}
              </Text>
              <Text style={card.priceLabel}>total round trip</Text>
            </View>
            <View style={card.metaPills}>
              <View style={card.nightsPill}>
                <Text style={card.nightsText}>
                  {item.nights} night{item.nights !== 1 ? "s" : ""}
                </Text>
              </View>
            </View>
          </View>

          {/* Divider */}
          <View style={card.divider} />

          {/* Outbound leg */}
          <LegCard leg={item.outbound} airlineLogos={airlineLogos} />

          <View style={card.legGap} />

          {/* Return leg */}
          <LegCard leg={item.return} airlineLogos={airlineLogos} />

          <View style={card.legGap} />

          {/* Single book button for the whole round trip */}
          <RoundTripBookBtn
            combo={item}
            origin={origin}
            destination={destination}
          />
        </View>
      </BlurView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// OneWayResultCard
// ---------------------------------------------------------------------------

export function OneWayResultCard({
  item,
  origin,
  destination,
  isCheapest = false,
  airlineLogos,
}: {
  item: FlightLeg;
  origin: string;
  destination: string;
  isCheapest?: boolean;
  airlineLogos?: Record<string, string>;
}) {
  return (
    <View style={[card.shadow, isCheapest && card.shadowCheapest]}>
      <BlurView intensity={60} tint="light" style={card.blurWrap}>
        <Pressable
          style={({ pressed }) => [
            card.inner,
            pressed && card.innerPressed,
          ]}
          onPress={() =>
            openBookingLink({
              outbound: item,
              origin,
              destination,
            })
          }
        >
          {/* Price row */}
          <View style={card.priceRow}>
            <View style={card.priceLeft}>
              {isCheapest && <CheapestBadge />}
              <Text style={[card.price, isCheapest && card.priceCheapest]}>
                ${item.price}
              </Text>
              <Text style={card.priceLabel}>{formatDateShort(item.date)}</Text>
            </View>
            <View style={card.bookBtnWrap}>
              <Text style={card.bookBtnText}>Book flight</Text>
              <View style={card.bookBtnChevron} />
            </View>
          </View>

          {/* Divider */}
          <View style={card.divider} />

          {/* Airline + flight path */}
          <View style={card.oneWayTopRow}>
            <AirlineLogo
              airline={item.airline}
              logoUrl={resolveLogoUrl(item, airlineLogos)}
              size={28}
            />
            <View style={{ flex: 1 }}>
              <Text style={legStyles.airline}>{item.airline}</Text>
            </View>
          </View>

          <FlightPath
            departureTime={item.departure_time}
            arrivalTime={item.arrival_time}
            duration={item.duration}
            stops={item.stops}
          />
        </Pressable>
      </BlurView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Shared card styles
// ---------------------------------------------------------------------------

const card = StyleSheet.create({
  shadow: {
    marginBottom: 14,
    borderRadius: 22,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  shadowCheapest: {
    shadowOpacity: 0.14,
    shadowRadius: 28,
    shadowColor: "#2563EB",
  },
  blurWrap: {
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.7)",
  },
  inner: {
    padding: 20,
    backgroundColor: "rgba(255, 255, 255, 0.55)",
  },
  innerPressed: {
    backgroundColor: "rgba(219, 234, 254, 0.3)",
    transform: [{ scale: 0.985 }],
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 18,
  },
  priceLeft: {
    gap: 4,
  },
  priceLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: "#94A3B8",
    letterSpacing: 0.1,
  },
  price: {
    fontFamily: fonts.extraBold,
    fontSize: 34,
    color: "#0F172A",
    letterSpacing: -1,
    lineHeight: 38,
  },
  priceCheapest: {
    color: "#0F172A",
  },
  metaPills: {
    alignItems: "flex-end",
    gap: 6,
  },
  nightsPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(219, 234, 254, 0.65)",
    borderWidth: 1,
    borderColor: "rgba(147, 197, 253, 0.25)",
  },
  nightsText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: "#2563EB",
    letterSpacing: 0.1,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(226, 232, 240, 0.5)",
    marginBottom: 14,
  },
  legGap: {
    height: 10,
  },
  bookBtnWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(59, 130, 246, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.15)",
  },
  bookBtnText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: "#2563EB",
  },
  bookBtnChevron: {
    width: 7,
    height: 7,
    borderRightWidth: 2,
    borderTopWidth: 2,
    borderColor: "#2563EB",
    transform: [{ rotate: "45deg" }],
  },
  oneWayTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 2,
  },
});
