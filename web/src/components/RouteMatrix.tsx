"use client";

import { useEffect, useState } from "react";

const ORIGINS = ["JFK", "LAX", "ORD", "SFO", "MIA"];
const DESTINATIONS = ["LHR", "CDG", "NRT", "BCN", "FCO"];

// Simulated prices — some are "deals"
const PRICES: { [key: string]: { price: number; deal: boolean } } = {
  "JFK-LHR": { price: 389, deal: false },
  "JFK-CDG": { price: 412, deal: false },
  "JFK-NRT": { price: 687, deal: false },
  "JFK-BCN": { price: 312, deal: true },
  "JFK-FCO": { price: 445, deal: false },
  "LAX-LHR": { price: 534, deal: false },
  "LAX-CDG": { price: 498, deal: false },
  "LAX-NRT": { price: 641, deal: true },
  "LAX-BCN": { price: 567, deal: false },
  "LAX-FCO": { price: 512, deal: false },
  "ORD-LHR": { price: 389, deal: true },
  "ORD-CDG": { price: 456, deal: false },
  "ORD-NRT": { price: 723, deal: false },
  "ORD-BCN": { price: 478, deal: false },
  "ORD-FCO": { price: 498, deal: false },
  "SFO-LHR": { price: 567, deal: false },
  "SFO-CDG": { price: 498, deal: true },
  "SFO-NRT": { price: 592, deal: false },
  "SFO-BCN": { price: 612, deal: false },
  "SFO-FCO": { price: 534, deal: false },
  "MIA-LHR": { price: 445, deal: false },
  "MIA-CDG": { price: 489, deal: false },
  "MIA-NRT": { price: 867, deal: false },
  "MIA-BCN": { price: 398, deal: false },
  "MIA-FCO": { price: 371, deal: true },
};

/**
 * Animated route × destination price matrix.
 * Cells light up sequentially like a scanner, deals glow green.
 */
export default function RouteMatrix() {
  const [scanned, setScanned] = useState<Set<string>>(new Set());
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    const allKeys: string[] = [];
    ORIGINS.forEach((o) => DESTINATIONS.forEach((d) => allKeys.push(`${o}-${d}`)));

    let idx = 0;
    const interval = setInterval(() => {
      if (idx < allKeys.length) {
        setScanned((prev) => new Set([...prev, allKeys[idx]]));
        idx++;
      } else {
        setScanning(false);
        clearInterval(interval);
      }
    }, 120);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-center">
        <thead>
          <tr>
            <th className="p-1.5 text-[10px] font-bold uppercase tracking-wider text-[#334155]" />
            {DESTINATIONS.map((d) => (
              <th
                key={d}
                className="p-1.5 text-[11px] font-extrabold tracking-tight text-[#5CB8F7]"
              >
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ORIGINS.map((o) => (
            <tr key={o}>
              <td className="p-1.5 text-[11px] font-extrabold tracking-tight text-[#94A3B8]">
                {o}
              </td>
              {DESTINATIONS.map((d) => {
                const key = `${o}-${d}`;
                const data = PRICES[key];
                const isScanned = scanned.has(key);
                const isDeal = data?.deal;

                return (
                  <td key={key} className="p-1">
                    <div
                      className={`rounded-md px-1.5 py-1.5 text-[11px] font-bold transition-all duration-300 ${
                        !isScanned
                          ? "bg-transparent text-[#1E293B]"
                          : isDeal
                            ? "bg-[rgba(34,197,94,0.12)] text-[#22C55E]"
                            : "bg-white/[0.03] text-[#64748B]"
                      }`}
                      style={{
                        boxShadow:
                          isScanned && isDeal
                            ? "0 0 12px rgba(34, 197, 94, 0.2)"
                            : "none",
                      }}
                    >
                      {isScanned ? `$${data.price}` : "···"}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Status line */}
      <div className="mt-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <div
            className={`h-1.5 w-1.5 rounded-full ${
              scanning ? "animate-pulse bg-[#2F9CF4]" : "bg-[#22C55E]"
            }`}
          />
          <span className="text-[10px] font-medium text-[#475569]">
            {scanning ? "Scanning prices..." : "5 deals found across 25 routes"}
          </span>
        </div>
        <span className="text-[10px] font-medium text-[#334155]">
          25 combos
        </span>
      </div>
    </div>
  );
}
