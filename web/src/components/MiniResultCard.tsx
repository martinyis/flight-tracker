"use client";

import { useEffect, useState } from "react";

const PRICES = ["$187", "$142", "$94"];
const STEP_DELAY = 500;
const INITIAL_DELAY = 2000;

/**
 * Animated mini flight result card — matches the mobile welcome screen.
 * Slides up, then counts the price down to the lowest found.
 */
export default function MiniResultCard() {
  const [visible, setVisible] = useState(false);
  const [priceIdx, setPriceIdx] = useState(0);

  useEffect(() => {
    // Card appears after 1.5s
    const showTimer = setTimeout(() => setVisible(true), 1500);

    // Price countdown starts at 2s
    const timers = PRICES.map((_, idx) => {
      if (idx === 0) return null;
      return setTimeout(
        () => setPriceIdx(idx),
        INITIAL_DELAY + idx * STEP_DELAY
      );
    }).filter(Boolean);

    return () => {
      clearTimeout(showTimer);
      timers.forEach((t) => t && clearTimeout(t));
    };
  }, []);

  const isFinal = priceIdx === PRICES.length - 1;

  return (
    <div
      className={`result-card mx-auto w-full max-w-sm rounded-2xl border border-[rgba(59,130,246,0.15)] bg-[#111D30] px-5 py-4 transition-all duration-600 ${
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-3 opacity-0"
      }`}
    >
      <div className="flex items-center justify-between">
        {/* Left: route info */}
        <div className="flex flex-col gap-1">
          <span className="text-[17px] font-bold tracking-wide text-white">
            JFK → LAX
          </span>
          <span className="text-xs font-normal text-white/50">
            Mar 7 – Mar 12
          </span>
          <span className="text-[11px] font-normal text-white/30">
            5 nights · Direct
          </span>
        </div>

        {/* Right: price */}
        <div className="flex flex-col items-end gap-0.5">
          <div className="flex items-center gap-1.5">
            <div
              className={`h-[7px] w-[7px] rounded-full bg-[#22C55E] ${
                isFinal ? "green-glow" : ""
              }`}
            />
            <span
              className={`text-[28px] font-extrabold tracking-tight transition-colors duration-300 ${
                isFinal ? "text-[#22C55E]" : "text-white/50"
              }`}
              key={priceIdx}
            >
              {PRICES[priceIdx]}
            </span>
          </div>
          <span className="text-[10px] font-normal tracking-wide text-[rgba(34,197,94,0.55)]">
            lowest found
          </span>
        </div>
      </div>
    </div>
  );
}
