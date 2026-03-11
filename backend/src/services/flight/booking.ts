const SERP_BASE = "https://serpapi.com/search.json";

// ── Internal helpers ──

async function extractBookingUrl(
  bookingOptions: any[]
): Promise<string | null> {
  for (const opt of bookingOptions) {
    const together = opt.together ?? opt.departing;
    const bookingReq = together?.booking_request;
    if (!bookingReq?.url) continue;

    if (bookingReq.post_data) {
      try {
        const redirectRes = await fetch(bookingReq.url, {
          method: "POST",
          body: bookingReq.post_data,
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          redirect: "manual",
        });
        const location = redirectRes.headers.get("location");
        if (location) return location;
      } catch {
        // POST redirect failed — fall through to return the URL directly
      }
    }

    return bookingReq.url;
  }

  return null;
}

async function resolveBookingToken(
  bookingToken: string
): Promise<string | null> {
  const params = new URLSearchParams({
    engine: "google_flights",
    booking_token: bookingToken,
    currency: "USD",
    hl: "en",
    api_key: process.env.SERPAPI_KEY!,
  });

  const res = await fetch(`${SERP_BASE}?${params}`);
  if (!res.ok) return null;

  const data: any = await res.json();
  if (data.booking_options?.length) {
    return extractBookingUrl(data.booking_options);
  }

  return null;
}

// ── Public API ──

export async function fetchBookingUrl(opts: {
  departure_token?: string;
  booking_token?: string;
  origin: string;
  destination: string;
  date: string;
  returnDate?: string;
}): Promise<string | null> {
  if (opts.booking_token) {
    return resolveBookingToken(opts.booking_token);
  }

  if (!opts.departure_token) return null;

  const isRoundTrip = !!opts.returnDate;
  const params = new URLSearchParams({
    engine: "google_flights",
    departure_id: opts.origin,
    arrival_id: opts.destination,
    outbound_date: opts.date,
    type: isRoundTrip ? "1" : "2",
    departure_token: opts.departure_token,
    currency: "USD",
    hl: "en",
    api_key: process.env.SERPAPI_KEY!,
  });
  if (opts.returnDate) {
    params.set("return_date", opts.returnDate);
  }

  const res = await fetch(`${SERP_BASE}?${params}`);
  if (!res.ok) return null;

  const data: any = await res.json();

  if (data.booking_options?.length) {
    const url = await extractBookingUrl(data.booking_options);
    if (url) return url;
  }

  const allFlights = [
    ...(data.best_flights ?? []),
    ...(data.other_flights ?? []),
  ];
  const bookingToken = allFlights[0]?.booking_token;
  if (bookingToken) {
    return resolveBookingToken(bookingToken);
  }

  return null;
}
