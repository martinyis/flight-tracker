"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { toPng } from "html-to-image";

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════ */

const W = 1320;
const H = 2868;

const SIZES = [
  { label: '6.9"', w: 1320, h: 2868 },
  { label: '6.5"', w: 1284, h: 2778 },
  { label: '6.3"', w: 1206, h: 2622 },
  { label: '6.1"', w: 1125, h: 2436 },
] as const;

// Phone mockup measurements
const MK_W = 1022;
const MK_H = 2082;
const SC_L = (52 / MK_W) * 100;
const SC_T = (46 / MK_H) * 100;
const SC_W = (918 / MK_W) * 100;
const SC_H = (1990 / MK_H) * 100;
const SC_RX = (126 / 918) * 100;
const SC_RY = (126 / 1990) * 100;

// Design tokens
const BLUE = "#3B82F6";
const NAVY = "#0B1628";
const ICE = "#DCEEFB";
const TEXT_DARK = "#0F172A";

const FONT = "var(--font-outfit), 'Outfit', sans-serif";

/* ═══════════════════════════════════════════════════════════════
   PHONE COMPONENT
   ═══════════════════════════════════════════════════════════════ */

function Phone({
  src,
  alt,
  style,
}: {
  src: string;
  alt: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        position: "relative",
        aspectRatio: `${MK_W}/${MK_H}`,
        ...style,
      }}
    >
      <img
        src="/mockup.png"
        alt=""
        style={{ display: "block", width: "100%", height: "100%" }}
        draggable={false}
      />
      <div
        style={{
          position: "absolute",
          zIndex: 10,
          overflow: "hidden",
          left: `${SC_L}%`,
          top: `${SC_T}%`,
          width: `${SC_W}%`,
          height: `${SC_H}%`,
          borderRadius: `${SC_RX}% / ${SC_RY}%`,
        }}
      >
        <img
          src={src}
          alt={alt}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "top",
          }}
          draggable={false}
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CAPTION COMPONENT
   ═══════════════════════════════════════════════════════════════ */

function Caption({
  label,
  headline,
  color = TEXT_DARK,
  labelColor = BLUE,
  align = "center",
}: {
  label?: string;
  headline: string;
  color?: string;
  labelColor?: string;
  align?: "left" | "center" | "right";
}) {
  return (
    <div style={{ textAlign: align }}>
      {label && (
        <div
          style={{
            fontSize: W * 0.028,
            fontWeight: 600,
            color: labelColor,
            letterSpacing: "0.08em",
            marginBottom: W * 0.02,
          }}
        >
          {label}
        </div>
      )}
      <div
        style={{
          fontSize: W * 0.095,
          fontWeight: 700,
          color,
          lineHeight: 1.0,
          letterSpacing: "-0.02em",
        }}
        dangerouslySetInnerHTML={{ __html: headline.replace(/\n/g, "<br />") }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SLIDE 1 — HERO
   "Stop checking flight prices."
   Layout: App icon → headline → centered phone
   ═══════════════════════════════════════════════════════════════ */

function Slide1() {
  return (
    <div
      style={{
        width: W,
        height: H,
        position: "relative",
        overflow: "hidden",
        background: `radial-gradient(ellipse 130% 80% at 50% 15%, ${ICE} 0%, #EBF3FE 40%, #F8FBFF 100%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: FONT,
      }}
    >
      {/* Decorative orb top-right */}
      <div
        style={{
          position: "absolute",
          top: -200,
          right: -150,
          width: 600,
          height: 600,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)",
        }}
      />
      {/* Decorative orb bottom-left */}
      <div
        style={{
          position: "absolute",
          bottom: H * 0.25,
          left: -200,
          width: 500,
          height: 500,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(165,180,252,0.06) 0%, transparent 60%)",
        }}
      />

      {/* App icon */}
      <img
        src="/app-icon.png"
        alt="Airfare"
        style={{
          width: 130,
          height: 130,
          borderRadius: 30,
          marginTop: H * 0.07,
          boxShadow: "0 8px 30px rgba(59,130,246,0.2)",
        }}
      />

      {/* Headline */}
      <div style={{ marginTop: W * 0.06 }}>
        <Caption headline={"Stop checking\nflight prices."} />
      </div>

      {/* Phone */}
      <Phone
        src="/screenshots/home.png"
        alt="Home dashboard"
        style={{
          width: W * 0.82,
          position: "absolute",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%) translateY(13%)",
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SLIDE 2 — FLEXIBLE SEARCH
   "Hundreds of dates. One search."
   Layout: Caption top-left → phone offset right
   ═══════════════════════════════════════════════════════════════ */

function Slide2() {
  return (
    <div
      style={{
        width: W,
        height: H,
        position: "relative",
        overflow: "hidden",
        background:
          "linear-gradient(165deg, #E8F4FD 0%, #F0F7FF 40%, #FAFCFF 100%)",
        fontFamily: FONT,
      }}
    >
      {/* Decorative circle left */}
      <div
        style={{
          position: "absolute",
          top: H * 0.35,
          left: -180,
          width: 450,
          height: 450,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)",
        }}
      />

      {/* Caption */}
      <div style={{ padding: `${H * 0.08}px ${W * 0.08}px` }}>
        <Caption
          label="FLEXIBLE DATES"
          headline={"Hundreds of dates.\nOne search."}
          align="left"
        />
      </div>

      {/* Phone — offset right */}
      <Phone
        src="/screenshots/dates.png"
        alt="Date selection"
        style={{
          width: W * 0.78,
          position: "absolute",
          bottom: 0,
          right: W * -0.04,
          transform: "translateY(12%)",
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SLIDE 3 — RESULTS (two phones)
   "The cheapest flight, found."
   Layout: Caption top-center → back phone (dimmed) + front phone
   ═══════════════════════════════════════════════════════════════ */

function Slide3() {
  return (
    <div
      style={{
        width: W,
        height: H,
        position: "relative",
        overflow: "hidden",
        background:
          "linear-gradient(180deg, #F0F7FF 0%, #FAFCFF 50%, #F6F9FF 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: FONT,
      }}
    >
      {/* Caption */}
      <div style={{ marginTop: H * 0.08 }}>
        <Caption
          label="BEST PRICE"
          headline={"The cheapest\nflight, found."}
        />
      </div>

      {/* Back phone (airports) — dimmed, rotated */}
      <Phone
        src="/screenshots/airports.png"
        alt="Airport selection"
        style={{
          width: W * 0.62,
          position: "absolute",
          bottom: 0,
          left: W * -0.02,
          transform: "translateY(18%) rotate(-5deg)",
          opacity: 0.4,
          filter: "blur(1.5px)",
        }}
      />

      {/* Front phone (results) */}
      <Phone
        src="/screenshots/results.png"
        alt="Flight results"
        style={{
          width: W * 0.82,
          position: "absolute",
          bottom: 0,
          right: W * -0.04,
          transform: "translateY(10%)",
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SLIDE 4 — PRICE TRACKING (dark)
   "Prices drop. You'll know."
   Layout: Caption top-center → phone centered with ambient glow
   ═══════════════════════════════════════════════════════════════ */

function Slide4() {
  return (
    <div
      style={{
        width: W,
        height: H,
        position: "relative",
        overflow: "hidden",
        background: `linear-gradient(180deg, #0D1B2A 0%, ${NAVY} 50%, #0A1220 100%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: FONT,
      }}
    >
      {/* Ambient glow behind phone */}
      <div
        style={{
          position: "absolute",
          top: H * 0.32,
          left: "50%",
          transform: "translateX(-50%)",
          width: W * 1.0,
          height: W * 1.0,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(59,130,246,0.18) 0%, rgba(59,130,246,0.06) 40%, transparent 70%)",
        }}
      />
      {/* Secondary glow — warm accent */}
      <div
        style={{
          position: "absolute",
          bottom: H * 0.1,
          right: -100,
          width: 400,
          height: 400,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(165,180,252,0.08) 0%, transparent 60%)",
        }}
      />

      {/* Caption */}
      <div style={{ marginTop: H * 0.08 }}>
        <Caption
          label="PRICE TRACKING"
          headline={"Prices drop.\nYou'll know."}
          color="#F8FAFC"
          labelColor="rgba(147,197,253,0.9)"
        />
      </div>

      {/* Phone */}
      <Phone
        src="/screenshots/tracking.png"
        alt="Price tracking"
        style={{
          width: W * 0.80,
          position: "absolute",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%) translateY(13%)",
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SLIDE 5 — PRICE HISTORY
   "See every price move."
   Layout: Caption top-right → phone offset left
   ═══════════════════════════════════════════════════════════════ */

function Slide5() {
  return (
    <div
      style={{
        width: W,
        height: H,
        position: "relative",
        overflow: "hidden",
        background: `linear-gradient(200deg, ${ICE} 0%, #E4F0FC 30%, #F2F8FF 100%)`,
        fontFamily: FONT,
      }}
    >
      {/* Decorative orb bottom-right */}
      <div
        style={{
          position: "absolute",
          bottom: H * 0.2,
          right: -120,
          width: 450,
          height: 450,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 60%)",
        }}
      />

      {/* Caption — right aligned */}
      <div
        style={{
          padding: `${H * 0.08}px ${W * 0.08}px`,
        }}
      >
        <Caption
          label="PRICE HISTORY"
          headline={"See every\nprice move."}
          align="right"
        />
      </div>

      {/* Phone — offset left */}
      <Phone
        src="/screenshots/price-history.png"
        alt="Price history"
        style={{
          width: W * 0.78,
          position: "absolute",
          bottom: 0,
          left: W * -0.02,
          transform: "translateY(12%)",
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SLIDE 6 — MORE FEATURES (dark)
   "And so much more."
   Layout: App icon → headline → feature pills (no phone)
   ═══════════════════════════════════════════════════════════════ */

function Slide6() {
  const pills = [
    "Flexible dates",
    "Push alerts",
    "Price charts",
    "Airline filters",
    "200+ date combos",
    "Multi-route tracking",
  ];

  return (
    <div
      style={{
        width: W,
        height: H,
        position: "relative",
        overflow: "hidden",
        background: `linear-gradient(160deg, #1E3A5F 0%, ${NAVY} 60%, #0A1220 100%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: FONT,
      }}
    >
      {/* Central glow */}
      <div
        style={{
          position: "absolute",
          top: "25%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: W * 1.2,
          height: W * 1.2,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 55%)",
        }}
      />

      {/* App icon */}
      <img
        src="/app-icon.png"
        alt="Airfare"
        style={{
          width: 180,
          height: 180,
          borderRadius: 42,
          marginTop: H * 0.22,
          boxShadow: "0 16px 50px rgba(0,0,0,0.45)",
        }}
      />

      {/* Headline */}
      <div style={{ marginTop: W * 0.08 }}>
        <Caption headline={"And so\nmuch more."} color="#F8FAFC" />
      </div>

      {/* Feature pills */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: W * 0.025,
          marginTop: W * 0.1,
          padding: `0 ${W * 0.08}px`,
          maxWidth: W * 0.92,
        }}
      >
        {pills.map((pill) => (
          <div
            key={pill}
            style={{
              padding: `${W * 0.02}px ${W * 0.045}px`,
              borderRadius: W * 0.06,
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.85)",
              fontSize: W * 0.034,
              fontWeight: 500,
            }}
          >
            {pill}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SCREENSHOT REGISTRY
   ═══════════════════════════════════════════════════════════════ */

const SCREENSHOTS = [
  { id: "hero", name: "Hero", Component: Slide1 },
  { id: "search", name: "Flexible Search", Component: Slide2 },
  { id: "results", name: "Results", Component: Slide3 },
  { id: "tracking", name: "Price Tracking", Component: Slide4 },
  { id: "history", name: "Price History", Component: Slide5 },
  { id: "more", name: "More Features", Component: Slide6 },
];

/* ═══════════════════════════════════════════════════════════════
   SCREENSHOT PREVIEW (ResizeObserver scaling)
   ═══════════════════════════════════════════════════════════════ */

function ScreenshotPreview({
  children,
  name,
  onExport,
}: {
  children: React.ReactNode;
  name: string;
  onExport: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.15);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width;
      if (width > 0) setScale(width / W);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        ref={containerRef}
        onClick={onExport}
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 12,
          aspectRatio: `${W}/${H}`,
          cursor: "pointer",
          boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
          transition: "box-shadow 0.2s, transform 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.18)";
          e.currentTarget.style.transform = "translateY(-2px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.1)";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        <div
          style={{
            width: W,
            height: H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
        {/* Hover overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.3)",
            opacity: 0,
            transition: "opacity 0.2s",
            borderRadius: 12,
            pointerEvents: "none",
          }}
          className="export-overlay"
        >
          <div
            style={{
              background: "white",
              color: "#111",
              padding: "10px 20px",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 14,
              fontFamily: FONT,
            }}
          >
            Export
          </div>
        </div>
      </div>
      <div
        style={{
          textAlign: "center",
          fontSize: 13,
          fontWeight: 500,
          color: "#666",
          fontFamily: FONT,
        }}
      >
        {name}
      </div>
      <style>{`
        div:hover > .export-overlay {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */

export default function ScreenshotsPage() {
  const [sizeIdx, setSizeIdx] = useState(0);
  const [exporting, setExporting] = useState(false);
  const exportRefs = useRef<(HTMLDivElement | null)[]>([]);

  const exportSlide = useCallback(
    async (index: number) => {
      const { w, h } = SIZES[sizeIdx];
      const el = exportRefs.current[index];
      if (!el) return;

      // Move on-screen for capture
      el.style.left = "0px";
      el.style.opacity = "1";
      el.style.zIndex = "-1";

      const opts = { width: W, height: H, pixelRatio: 1, cacheBust: true };

      // Double-call trick: first warms fonts/images, second is clean
      await toPng(el, opts);
      const dataUrl = await toPng(el, opts);

      // Move back offscreen
      el.style.left = "-9999px";
      el.style.opacity = "";
      el.style.zIndex = "";

      // Resize to target dimensions
      const img = new Image();
      img.src = dataUrl;
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
      });

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);

      const finalUrl = canvas.toDataURL("image/png");

      // Trigger download
      const a = document.createElement("a");
      a.href = finalUrl;
      a.download = `${String(index + 1).padStart(2, "0")}-${SCREENSHOTS[index].id}-${w}x${h}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },
    [sizeIdx],
  );

  const exportAll = useCallback(async () => {
    setExporting(true);
    for (let i = 0; i < SCREENSHOTS.length; i++) {
      await exportSlide(i);
      if (i < SCREENSHOTS.length - 1) {
        await new Promise((r) => setTimeout(r, 400));
      }
    }
    setExporting(false);
  }, [exportSlide]);

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "32px 24px",
        fontFamily: FONT,
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 32,
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#111",
            margin: 0,
          }}
        >
          Airfare — App Store Screenshots
        </h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <select
            value={sizeIdx}
            onChange={(e) => setSizeIdx(Number(e.target.value))}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #ddd",
              fontSize: 14,
              fontFamily: FONT,
              background: "white",
              cursor: "pointer",
            }}
          >
            {SIZES.map((s, i) => (
              <option key={i} value={i}>
                {s.label} — {s.w}x{s.h}
              </option>
            ))}
          </select>
          <button
            onClick={exportAll}
            disabled={exporting}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              border: "none",
              background: exporting ? "#94A3B8" : BLUE,
              color: "white",
              fontSize: 14,
              fontWeight: 600,
              cursor: exporting ? "not-allowed" : "pointer",
              fontFamily: FONT,
              transition: "background 0.2s",
            }}
          >
            {exporting ? "Exporting..." : "Export All"}
          </button>
        </div>
      </div>

      {/* Preview grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 24,
        }}
      >
        {SCREENSHOTS.map((ss, i) => (
          <ScreenshotPreview
            key={ss.id}
            name={ss.name}
            onExport={() => exportSlide(i)}
          >
            <ss.Component />
          </ScreenshotPreview>
        ))}
      </div>

      {/* Offscreen export containers */}
      {SCREENSHOTS.map((ss, i) => (
        <div
          key={`export-${ss.id}`}
          ref={(el) => {
            exportRefs.current[i] = el;
          }}
          style={{
            position: "absolute",
            left: -9999,
            top: 0,
            width: W,
            height: H,
            fontFamily: FONT,
          }}
        >
          <ss.Component />
        </div>
      ))}
    </div>
  );
}
