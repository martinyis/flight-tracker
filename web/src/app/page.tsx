import DotGrid from "@/components/DotGrid";
import MiniResultCard from "@/components/MiniResultCard";
import PriceFeed from "@/components/PriceFeed";
import RouteMatrix from "@/components/RouteMatrix";
import PriceChart from "@/components/PriceChart";

export default function Home() {
  return (
    <div>
      {/* ════════════════════════════════════════════════════════════════════
          HERO
          ════════════════════════════════════════════════════════════════════ */}
      <section className="relative flex min-h-[100vh] flex-col items-center overflow-hidden">
        <div className="absolute inset-0">
          <DotGrid />
        </div>

        <div className="relative z-10 flex flex-1 flex-col items-center px-5">
          <div className="mt-[12vh] text-center sm:mt-[14vh]">
            <h1 className="text-[32px] font-extrabold tracking-tight text-white sm:text-[48px]">
              AirFare
            </h1>
            <p className="mt-2 max-w-md text-[18px] font-normal leading-8 text-white/60 sm:text-[22px] sm:leading-9">
              We check every date so you don&apos;t have to.
            </p>
          </div>

          <div className="mt-16 w-full max-w-sm sm:mt-20">
            <div className="mx-auto mb-1.5 h-6 w-px bg-[rgba(59,130,246,0.08)]" />
            <MiniResultCard />
          </div>

          <div className="mt-12 text-center sm:mt-16">
            <h2 className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
              Never overpay for
              <br />
              <span className="gradient-text">flights again</span>
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base font-normal text-[#94A3B8]">
              Track flight prices across hundreds of routes.
              Get instant alerts when prices drop. Save money on every trip.
            </p>
          </div>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <div className="cta-glow inline-flex h-12 items-center justify-center rounded-xl bg-[#2F9CF4] px-8 text-sm font-bold text-white transition-all hover:bg-[#1A7ED4]">
              Coming Soon to App Store
            </div>
            <a
              href="#bento"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.06] px-8 text-sm font-semibold text-[#CBD5E1] transition-all hover:bg-white/[0.1] hover:text-white"
            >
              See How It Works
            </a>
          </div>

          <div className="mt-auto mb-8 float">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#334155]">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          BENTO GRID — interactive feature demos
          ════════════════════════════════════════════════════════════════════ */}
      <section id="bento" className="relative mx-auto max-w-5xl px-5 py-28">
        {/* Glow orbs */}
        <div className="pointer-events-none absolute left-1/4 top-20 h-[400px] w-[400px] rounded-full bg-[#2F9CF4]/[0.03] blur-[120px]" />
        <div className="pointer-events-none absolute right-1/4 bottom-20 h-[300px] w-[300px] rounded-full bg-[#22C55E]/[0.02] blur-[100px]" />

        <div className="relative mb-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Your personal flight analyst
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-base font-normal text-[#64748B]">
            AirFare scans prices every 4 hours across every date combination
            you care about. Here&apos;s what that looks like.
          </p>
        </div>

        {/* ── Bento Grid ── */}
        <div className="relative grid gap-4 lg:grid-cols-3 lg:grid-rows-[auto_auto_auto]">

          {/* ┌─────────────────────────────────────────────────────────┐
              │  CELL 1: Route Matrix (spans 2 cols)                    │
              │  "You pick the cities. We scan every combination."     │
              └─────────────────────────────────────────────────────────┘ */}
          <div className="rounded-2xl border border-white/[0.05] bg-[#0D1B2E] p-5 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[rgba(47,156,244,0.1)]">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2F9CF4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                    </svg>
                  </div>
                  <span className="text-[13px] font-bold text-white">
                    Multi-route scanning
                  </span>
                </div>
                <p className="text-[12px] font-normal text-[#475569]">
                  5 origins &times; 5 destinations = 25 price checks in one search
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-full bg-[rgba(47,156,244,0.08)] px-2.5 py-1">
                <div className="h-1 w-1 animate-pulse rounded-full bg-[#2F9CF4]" />
                <span className="text-[10px] font-semibold text-[#5CB8F7]">LIVE</span>
              </div>
            </div>
            <RouteMatrix />
          </div>

          {/* ┌─────────────────────────────────────────────────────────┐
              │  CELL 2: Stats — the counter card                       │
              └─────────────────────────────────────────────────────────┘ */}
          <div className="flex flex-col justify-between rounded-2xl border border-white/[0.05] bg-[#0D1B2E] p-5">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#334155]">
                Every 4 hours
              </span>
              <div className="mt-3">
                <span className="text-[42px] font-extrabold leading-none tracking-tighter text-white">
                  6<span className="text-[#2F9CF4]">&times;</span>
                </span>
                <p className="mt-1 text-[13px] font-normal text-[#475569]">
                  daily price checks per tracked search
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-[#475569]">Checks today</span>
                <span className="text-[11px] font-bold text-white">2,847</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.04]">
                <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-[#2F9CF4] to-[#06B6D4]" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-[#475569]">Deals found</span>
                <span className="text-[11px] font-bold text-[#22C55E]">142</span>
              </div>
            </div>
          </div>

          {/* ┌─────────────────────────────────────────────────────────┐
              │  CELL 3: Price chart (spans 1 col)                      │
              └─────────────────────────────────────────────────────────┘ */}
          <div className="rounded-2xl border border-white/[0.05] bg-[#0D1B2E] p-5">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[rgba(34,197,94,0.1)]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" x2="12" y1="20" y2="10" />
                  <line x1="18" x2="18" y1="20" y2="4" />
                  <line x1="6" x2="6" y1="20" y2="16" />
                </svg>
              </div>
              <div>
                <span className="text-[13px] font-bold text-white">JFK → BCN</span>
                <span className="ml-2 text-[11px] font-medium text-[#475569]">price history</span>
              </div>
            </div>
            <PriceChart />
          </div>

          {/* ┌─────────────────────────────────────────────────────────┐
              │  CELL 4: Live price drop feed (spans 2 cols)            │
              └─────────────────────────────────────────────────────────┘ */}
          <div className="rounded-2xl border border-white/[0.05] bg-[#0D1B2E] p-5 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[rgba(245,158,11,0.1)]">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                  </svg>
                </div>
                <div>
                  <span className="text-[13px] font-bold text-white">
                    Price drops right now
                  </span>
                  <span className="ml-2 text-[11px] font-medium text-[#334155]">
                    auto-updating
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 rounded-full bg-[rgba(34,197,94,0.08)] px-2.5 py-1">
                <div className="h-1 w-1 animate-pulse rounded-full bg-[#22C55E]" />
                <span className="text-[10px] font-semibold text-[#22C55E]">LIVE</span>
              </div>
            </div>
            <PriceFeed />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          TRUST LINE — not "how it works", just one strong sentence
          ════════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden px-5 py-28">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-[300px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2F9CF4]/[0.04] blur-[120px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-3xl">
          {/* Big number callout */}
          <div className="mb-16 flex flex-col items-center gap-6 sm:flex-row sm:justify-center sm:gap-16">
            <div className="text-center">
              <span className="text-[48px] font-extrabold leading-none tracking-tighter text-white sm:text-[56px]">
                50
              </span>
              <p className="mt-1 text-[13px] font-medium text-[#475569]">
                free credits on signup
              </p>
            </div>
            <div className="hidden h-12 w-px bg-white/[0.06] sm:block" />
            <div className="text-center">
              <span className="text-[48px] font-extrabold leading-none tracking-tighter text-[#22C55E] sm:text-[56px]">
                4h
              </span>
              <p className="mt-1 text-[13px] font-medium text-[#475569]">
                price check interval
              </p>
            </div>
            <div className="hidden h-12 w-px bg-white/[0.06] sm:block" />
            <div className="text-center">
              <span className="text-[48px] font-extrabold leading-none tracking-tighter text-[#F59E0B] sm:text-[56px]">
                200+
              </span>
              <p className="mt-1 text-[13px] font-medium text-[#475569]">
                route combos per search
              </p>
            </div>
          </div>

          {/* Features as short punchy lines, not cards */}
          <div className="grid gap-x-12 gap-y-6 sm:grid-cols-2">
            <Perk
              emoji={false}
              accent="blue"
              text="Sign in with Apple or Google. No passwords, no forms."
            />
            <Perk
              emoji={false}
              accent="green"
              text="Credits refunded automatically if a search fails."
            />
            <Perk
              emoji={false}
              accent="warm"
              text="Same search within 24h? Free. No duplicate charges."
            />
            <Perk
              emoji={false}
              accent="blue"
              text="Tracking runs until you say stop — or until departure."
            />
            <Perk
              emoji={false}
              accent="green"
              text="Push notifications the instant a price drops."
            />
            <Perk
              emoji={false}
              accent="warm"
              text="Your data is never sold. Not to airlines, not to anyone."
            />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          BOTTOM CTA
          ════════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden px-5 pb-28 pt-8">
        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <p className="mb-3 text-[13px] font-semibold text-[#2F9CF4]">
            Stop checking Google Flights every morning
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Let AirFare do the scanning.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-base font-normal text-[#475569]">
            50 free credits to get started. No credit card. No commitment.
          </p>
          <div className="mt-8">
            <div className="cta-glow inline-flex h-12 items-center justify-center rounded-xl bg-[#2F9CF4] px-8 text-sm font-bold text-white transition-all hover:bg-[#1A7ED4]">
              Coming Soon
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ─── Perk line — minimal, punchy ─── */
function Perk({
  text,
  accent,
}: {
  emoji: boolean;
  text: string;
  accent: "blue" | "green" | "warm";
}) {
  const dotColor =
    accent === "blue"
      ? "bg-[#2F9CF4]"
      : accent === "green"
        ? "bg-[#22C55E]"
        : "bg-[#F59E0B]";

  return (
    <div className="flex items-start gap-3">
      <div className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${dotColor}`} />
      <p className="text-[14px] font-medium leading-relaxed text-[#94A3B8]">
        {text}
      </p>
    </div>
  );
}
