const SERP_BASE = "https://serpapi.com/search.json";

interface FlightLeg {
  date: string;
  price: number;
  airline: string;
  departure_time: string;
  arrival_time: string;
  duration: number;
  stops: number;
  flights: SerpFlight[];
}

interface SerpFlight {
  airline: string;
  flight_number: string;
  departure_airport: { name: string; id: string; time: string };
  arrival_airport: { name: string; id: string; time: string };
  duration: number;
}

export interface FlightCombo {
  outbound: FlightLeg;
  return: FlightLeg;
  totalPrice: number;
  nights: number;
}

export interface SearchParams {
  origin: string;
  destination: string;
  dateFrom: string;       // YYYY-MM-DD
  dateTo: string;         // YYYY-MM-DD
  minNights: number;
  maxNights: number;
}

// ---------- helpers ----------

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function diffDays(a: string, b: string): number {
  const msA = new Date(a + "T00:00:00Z").getTime();
  const msB = new Date(b + "T00:00:00Z").getTime();
  return Math.round((msB - msA) / 86_400_000);
}

function generateDates(from: string, to: string): string[] {
  const dates: string[] = [];
  let cur = from;
  while (cur <= to) {
    dates.push(cur);
    cur = addDays(cur, 1);
  }
  return dates;
}

// ---------- SerpAPI call ----------

async function searchOneWay(
  origin: string,
  destination: string,
  date: string
): Promise<FlightLeg[]> {
  const params = new URLSearchParams({
    engine: "google_flights",
    departure_id: origin,
    arrival_id: destination,
    outbound_date: date,
    type: "2",          // one-way
    currency: "USD",
    hl: "en",
    api_key: process.env.SERPAPI_KEY!,
  });

  const res = await fetch(`${SERP_BASE}?${params}`);
  if (!res.ok) {
    throw new Error(`SerpAPI error ${res.status}: ${await res.text()}`);
  }

  const data: any = await res.json();
  const legs: FlightLeg[] = [];

  for (const group of [...(data.best_flights ?? []), ...(data.other_flights ?? [])]) {
    const flights: SerpFlight[] = group.flights ?? [];
    if (flights.length === 0) continue;

    const first = flights[0];
    const last = flights[flights.length - 1];

    legs.push({
      date,
      price: group.price,
      airline: first.airline,
      departure_time: first.departure_airport.time,
      arrival_time: last.arrival_airport.time,
      duration: group.total_duration,
      stops: flights.length - 1,
      flights,
    });
  }

  return legs;
}

// ---------- main search ----------

export async function findCheapestCombos(
  params: SearchParams
): Promise<FlightCombo[]> {
  const { origin, destination, dateFrom, dateTo, minNights, maxNights } = params;

  // outbound dates: dateFrom up to dateTo minus minNights
  const lastOutbound = addDays(dateTo, -minNights);
  const outboundDates = generateDates(dateFrom, lastOutbound);

  // return dates: dateFrom + minNights up to dateTo
  const firstReturn = addDays(dateFrom, minNights);
  const returnDates = generateDates(firstReturn, dateTo);

  // fire all one-way searches in parallel (outbound + return)
  const [outboundResults, returnResults] = await Promise.all([
    Promise.all(outboundDates.map((d) => searchOneWay(origin, destination, d))),
    Promise.all(returnDates.map((d) => searchOneWay(destination, origin, d))),
  ]);

  // flatten: cheapest per outbound date
  const cheapestOutbound = new Map<string, FlightLeg>();
  for (const legs of outboundResults) {
    for (const leg of legs) {
      const existing = cheapestOutbound.get(leg.date);
      if (!existing || leg.price < existing.price) {
        cheapestOutbound.set(leg.date, leg);
      }
    }
  }

  // flatten: cheapest per return date
  const cheapestReturn = new Map<string, FlightLeg>();
  for (const legs of returnResults) {
    for (const leg of legs) {
      const existing = cheapestReturn.get(leg.date);
      if (!existing || leg.price < existing.price) {
        cheapestReturn.set(leg.date, leg);
      }
    }
  }

  // combine valid pairs
  const combos: FlightCombo[] = [];
  for (const [outDate, outLeg] of cheapestOutbound) {
    for (const [retDate, retLeg] of cheapestReturn) {
      const nights = diffDays(outDate, retDate);
      if (nights >= minNights && nights <= maxNights) {
        combos.push({
          outbound: outLeg,
          return: retLeg,
          totalPrice: outLeg.price + retLeg.price,
          nights,
        });
      }
    }
  }

  // sort by total price, return top 10
  combos.sort((a, b) => a.totalPrice - b.totalPrice);
  return combos.slice(0, 10);
}
