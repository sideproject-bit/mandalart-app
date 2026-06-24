import React from "react";
import { Grid3x3, CalendarDays, Timer, CheckCircle2 } from "lucide-react";

const FEATURE_ICONS = [Grid3x3, CalendarDays, Timer];
const FEATURE_ACCENT_KEYS = ["accent", "accent2", "accent3"];

function GridPhilosophyVisual({ pal }) {
  const cells = [
    { x: 0, y: 0, color: pal.accent },
    { x: 1, y: 0, color: "transparent" },
    { x: 2, y: 0, color: pal.accent2 },
    { x: 0, y: 1, color: "transparent" },
    { x: 1, y: 1, color: pal.accent3 },
    { x: 2, y: 1, color: "transparent" },
    { x: 0, y: 2, color: pal.accent2 },
    { x: 1, y: 2, color: "transparent" },
    { x: 2, y: 2, color: pal.accent },
  ];
  const S = 28, G = 3;
  return (
    <svg width={(S + G) * 3} height={(S + G) * 3} viewBox={`0 0 ${(S + G) * 3} ${(S + G) * 3}`} style={{ display: "block" }}>
      {cells.map((c, i) => (
        <rect key={i}
          x={c.x * (S + G)} y={c.y * (S + G)}
          width={S} height={S}
          fill={c.color === "transparent" ? pal.ink + "0a" : c.color + "cc"}
          stroke={pal.ink + "22"} strokeWidth={1}
          rx={2}
        />
      ))}
    </svg>
  );
}

export default function AboutPage({ pal, t, dark }) {
  const about = t.about;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", color: pal.ink }}>

      {/* Hero */}
      <div style={{ marginBottom: 48 }}>
        <h2 style={{ fontWeight: 900, fontSize: 32, textTransform: "uppercase", margin: "0 0 10px", letterSpacing: "-0.02em" }}>
          {about.title}
        </h2>
        <p style={{ fontSize: 16, opacity: 0.6, margin: 0, fontWeight: 500 }}>
          {about.intro}
        </p>
        <div style={{ borderTop: `3px solid ${pal.ink}`, marginTop: 20 }} />
      </div>

      {/* Philosophy */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr auto", gap: 32,
        alignItems: "center", marginBottom: 52,
        padding: "28px 32px",
        border: `2px solid ${pal.ink}18`,
        background: dark ? "#0f0e09" : "#f8f5ec",
      }}>
        <div>
          <div style={{
            display: "inline-block",
            background: pal.accent, color: "#fff",
            fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em",
            padding: "3px 8px", borderRadius: 3, marginBottom: 12,
          }}>
            {about.philosophy.title}
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.85, margin: 0, opacity: 0.85, wordBreak: "keep-all" }}>
            {about.philosophy.body}
          </p>
        </div>
        <div style={{ flexShrink: 0, opacity: 0.7 }}>
          <GridPhilosophyVisual pal={pal} />
        </div>
      </div>

      {/* Feature cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {about.features.map((feat, i) => {
          const Icon = FEATURE_ICONS[i];
          const accentKey = FEATURE_ACCENT_KEYS[i];
          const acc = pal[accentKey];
          return (
            <div key={i} style={{
              border: `2px solid ${pal.ink}14`,
              overflow: "hidden",
            }}>
              {/* Colored header */}
              <div style={{
                background: acc, padding: "10px 20px",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <Icon size={16} color="#fff" />
                <span style={{ fontWeight: 900, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#fff" }}>
                  {feat.tag}
                </span>
              </div>

              {/* Content */}
              <div style={{
                padding: "20px 24px 22px",
                display: "grid", gridTemplateColumns: "1fr 220px", gap: 24, alignItems: "start",
                background: dark ? "#0f0e09" : "#faf7ef",
              }}>
                <div>
                  <h3 style={{ fontWeight: 900, fontSize: 20, margin: "0 0 12px", letterSpacing: "-0.01em" }}>
                    {feat.title}
                  </h3>
                  <p style={{ fontSize: 13.5, lineHeight: 1.8, margin: 0, opacity: 0.8, wordBreak: "keep-all" }}>
                    {feat.body}
                  </p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {feat.benefits.map((b, j) => (
                    <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <CheckCircle2 size={14} color={acc} style={{ flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontSize: 12.5, lineHeight: 1.6, opacity: 0.8, wordBreak: "keep-all" }}>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
