"use client";

import { useEffect, useState } from "react";

// Simulated 14-day price history for JFK → BCN
const PRICES = [487, 492, 478, 501, 489, 467, 445, 423, 398, 412, 389, 367, 342, 312];
const DATES = ["Mar 1", "", "3", "", "5", "", "7", "", "9", "", "11", "", "13", "14"];

const MAX = Math.max(...PRICES);
const MIN = Math.min(...PRICES);

/**
 * Animated price history chart — SVG line that draws itself.
 * Shows price trending down with the final point highlighted green.
 */
export default function PriceChart() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const steps = PRICES.length;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setProgress(step / steps);
      if (step >= steps) clearInterval(interval);
    }, 150);
    return () => clearInterval(interval);
  }, []);

  const width = 280;
  const height = 100;
  const padX = 8;
  const padY = 8;

  const points = PRICES.map((p, i) => {
    const x = padX + (i / (PRICES.length - 1)) * (width - padX * 2);
    const y = padY + ((p - MIN) / (MAX - MIN)) * (height - padY * 2);
    // Invert Y since SVG y goes down
    return { x, y: height - y };
  });

  const visibleCount = Math.floor(progress * PRICES.length);
  const visiblePoints = points.slice(0, visibleCount);

  const pathD = visiblePoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  // Gradient fill path
  const fillD =
    visiblePoints.length > 1
      ? `${pathD} L ${visiblePoints[visiblePoints.length - 1].x} ${height} L ${visiblePoints[0].x} ${height} Z`
      : "";

  const lastPoint = visiblePoints[visiblePoints.length - 1];
  const isComplete = visibleCount >= PRICES.length;

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ maxHeight: 100 }}
      >
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={isComplete ? "#22C55E" : "#2F9CF4"}
              stopOpacity="0.15"
            />
            <stop
              offset="100%"
              stopColor={isComplete ? "#22C55E" : "#2F9CF4"}
              stopOpacity="0"
            />
          </linearGradient>
        </defs>

        {/* Fill area */}
        {fillD && (
          <path d={fillD} fill="url(#chartFill)" />
        )}

        {/* Line */}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke={isComplete ? "#22C55E" : "#2F9CF4"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Current point */}
        {lastPoint && (
          <>
            <circle
              cx={lastPoint.x}
              cy={lastPoint.y}
              r="4"
              fill={isComplete ? "#22C55E" : "#2F9CF4"}
            />
            <circle
              cx={lastPoint.x}
              cy={lastPoint.y}
              r="8"
              fill={isComplete ? "#22C55E" : "#2F9CF4"}
              opacity="0.2"
            />
          </>
        )}
      </svg>

      {/* Date labels */}
      <div className="mt-1 flex justify-between px-2">
        {DATES.map((d, i) => (
          <span key={i} className="text-[9px] font-medium text-[#334155]">
            {d}
          </span>
        ))}
      </div>

      {/* Price label */}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px] font-medium text-[#475569]">
          14-day history
        </span>
        {isComplete && (
          <div className="flex items-center gap-1.5">
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#22C55E"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
            <span className="text-[11px] font-bold text-[#22C55E]">
              -36% from peak
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
