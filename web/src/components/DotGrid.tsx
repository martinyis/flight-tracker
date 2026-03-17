"use client";

import { useEffect, useRef, useState, useMemo } from "react";

const GAP = 18; // px between dots — tighter = denser grid

/**
 * Animated dot grid — fills the entire container with a dense field of dots.
 * Calculates rows/cols dynamically from container dimensions.
 * Random dots "highlight" to simulate a price scanning effect.
 */
export default function DotGrid() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [highlighted, setHighlighted] = useState<Set<number>>(new Set());

  const cols = Math.max(1, Math.floor(dims.w / GAP));
  const rows = Math.max(1, Math.floor(dims.h / GAP));
  const total = rows * cols;

  // Measure container
  useEffect(() => {
    const measure = () => {
      if (!containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      setDims({ w: width, h: height });
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Highlight ~4% of dots, cycling every 1.8s
  useEffect(() => {
    if (total < 2) return;
    const count = Math.max(12, Math.floor(total * 0.04));

    const cycle = () => {
      const next = new Set<number>();
      while (next.size < count) {
        next.add(Math.floor(Math.random() * total));
      }
      setHighlighted(next);
    };

    cycle();
    const interval = setInterval(cycle, 1800);
    return () => clearInterval(interval);
  }, [total]);

  // Pre-compute dot positions absolutely so we don't rely on CSS grid sizing
  const dots = useMemo(() => {
    if (cols < 1 || rows < 1) return [];
    const offsetX = (dims.w - (cols - 1) * GAP) / 2;
    const offsetY = (dims.h - (rows - 1) * GAP) / 2;
    return Array.from({ length: total }, (_, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      return {
        x: offsetX + col * GAP,
        y: offsetY + row * GAP,
      };
    });
  }, [cols, rows, dims.w, dims.h, total]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* Scan line sweeping top to bottom */}
      <div className="scan-line" />

      {/* Dots — absolutely positioned for precise placement */}
      {dots.map((pos, i) => {
        const isHighlighted = highlighted.has(i);
        return (
          <div
            key={i}
            className={`absolute rounded-full transition-all duration-700 ${
              isHighlighted
                ? "h-[5px] w-[5px] bg-[#5CB8F7]"
                : "h-[2px] w-[2px] bg-[#2F9CF4]"
            }`}
            style={{
              left: pos.x,
              top: pos.y,
              opacity: isHighlighted ? 0.85 : 0.15,
              transform: "translate(-50%, -50%)",
              boxShadow: isHighlighted
                ? "0 0 10px rgba(92, 184, 247, 0.6)"
                : "none",
            }}
          />
        );
      })}

      {/* Edge fades — smooth dissolve on all sides */}
      <div className="absolute top-0 left-0 right-0 h-[15%] bg-gradient-to-b from-[#0A1628] to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-b from-transparent to-[#0A1628]" />
      <div className="absolute top-0 bottom-0 left-0 w-[10%] bg-gradient-to-r from-[#0A1628] to-transparent" />
      <div className="absolute top-0 bottom-0 right-0 w-[10%] bg-gradient-to-l from-[#0A1628] to-transparent" />
    </div>
  );
}
