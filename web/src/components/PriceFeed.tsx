"use client";

import { useEffect, useState } from "react";

interface PriceDrop {
  route: string;
  from: string;
  to: string;
  pct: number;
  ago: string;
}

const DROPS: PriceDrop[] = [
  { route: "JFK → BCN", from: "$487", to: "$312", pct: 36, ago: "2m ago" },
  { route: "LAX → NRT", from: "$923", to: "$641", pct: 31, ago: "5m ago" },
  { route: "ORD → LHR", from: "$612", to: "$389", pct: 36, ago: "8m ago" },
  { route: "SFO → CDG", from: "$756", to: "$498", pct: 34, ago: "12m ago" },
  { route: "MIA → FCO", from: "$534", to: "$371", pct: 31, ago: "14m ago" },
  { route: "BOS → DUB", from: "$445", to: "$289", pct: 35, ago: "18m ago" },
  { route: "SEA → ICN", from: "$867", to: "$592", pct: 32, ago: "21m ago" },
  { route: "ATL → AMS", from: "$598", to: "$412", pct: 31, ago: "25m ago" },
];

/**
 * Infinite-scrolling ticker of live price drops.
 * Creates the feeling that the app is always working.
 */
export default function PriceFeed() {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setOffset((prev) => (prev + 1) % DROPS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Show 4 items at a time, cycling through
  const visible = Array.from({ length: 4 }, (_, i) =>
    DROPS[(offset + i) % DROPS.length]
  );

  return (
    <div className="flex flex-col gap-2">
      {visible.map((drop, i) => (
        <div
          key={`${drop.route}-${offset}-${i}`}
          className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2.5 transition-all duration-500"
          style={{
            animation: i === 0 ? "fade-up 0.4s ease-out" : undefined,
          }}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[rgba(34,197,94,0.1)]">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#22C55E"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
            <span className="text-[13px] font-semibold text-white">
              {drop.route}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[12px] font-normal text-[#64748B] line-through">
              {drop.from}
            </span>
            <span className="text-[13px] font-bold text-[#22C55E]">
              {drop.to}
            </span>
            <span className="text-[10px] font-medium text-[#334155]">
              {drop.ago}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
